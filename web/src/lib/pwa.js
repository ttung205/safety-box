import { registerSW } from 'virtual:pwa-register';
import { computed, ref } from 'vue';
import { api } from './api.js';

// ---- Trạng thái mạng ----
export const online = ref(navigator.onLine);
window.addEventListener('online', () => (online.value = true));
window.addEventListener('offline', () => (online.value = false));

// ---- Cập nhật phiên bản mới ----
export const needRefresh = ref(false);
const updateSW = registerSW({ onNeedRefresh: () => (needRefresh.value = true) });
export const applyUpdate = () => updateSW(true);

// ---- Cài ứng dụng ----
const ua = navigator.userAgent;
export const isIos = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
export const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const installEvent = ref(null);
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent.value = e;
});
window.addEventListener('appinstalled', () => (installEvent.value = null));

// iOS không có sự kiện cài đặt nên chỉ hướng dẫn thủ công.
export const canInstall = computed(() => !isStandalone && (Boolean(installEvent.value) || isIos));

// Trả về 'ios' khi cần hiện hướng dẫn thủ công.
export async function installApp() {
  if (installEvent.value) {
    installEvent.value.prompt();
    await installEvent.value.userChoice;
    installEvent.value = null;
    return 'prompted';
  }
  return 'ios';
}

// ---- Web Push ----
// 'unsupported' | 'needs-install' (iOS chưa cài lên màn hình chính) | 'denied' | 'off' | 'on'
export const pushState = ref('off');

const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function refreshPushState() {
  if (!pushSupported) {
    pushState.value = isIos && !isStandalone ? 'needs-install' : 'unsupported';
  } else if (Notification.permission === 'denied') {
    pushState.value = 'denied';
  } else {
    pushState.value = Notification.permission === 'granted' && (await currentSubscription()) ? 'on' : 'off';
  }
  return pushState.value;
}

async function sendSubscription(sub) {
  await api('/dash-api/push/subscribe', { method: 'POST', body: sub.toJSON() });
}

// Phải gọi trực tiếp từ thao tác bấm của người dùng (Safari yêu cầu như vậy).
export async function enablePush() {
  if (!pushSupported) throw new Error(pushState.value === 'needs-install'
    ? 'Hãy cài ứng dụng lên màn hình chính trước, sau đó bật thông báo.'
    : 'Trình duyệt này không hỗ trợ thông báo đẩy.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    await refreshPushState();
    throw new Error('Bạn chưa cho phép thông báo. Hãy bật quyền Thông báo cho trang này trong cài đặt trình duyệt.');
  }
  const { enabled, publicKey } = await api('/dash-api/push/config');
  if (!enabled) throw new Error('Máy chủ chưa cấu hình thông báo đẩy.');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  }
  await sendSubscription(sub);
  pushState.value = 'on';
}

export async function disablePush() {
  try {
    const sub = pushSupported ? await currentSubscription() : null;
    if (sub) {
      await api('/dash-api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
      await sub.unsubscribe();
    }
  } finally {
    await refreshPushState();
  }
}

// Sau khi đăng nhập: nếu thiết bị đã bật thông báo thì gắn lại với tài khoản hiện tại.
export async function syncPush() {
  if ((await refreshPushState()) !== 'on') return;
  const sub = await currentSubscription();
  if (sub) await sendSubscription(sub).catch(() => {});
}
