import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Thông báo đẩy gốc Android (FCM) cho app Capacitor: rung + kêu kể cả khi app đóng.
// Cần biến môi trường FIREBASE_SERVICE_ACCOUNT = nội dung file JSON của service account.
let messaging = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    messaging = getMessaging(app);
  }
} catch (err) {
  console.warn(`[FCM] Cấu hình FIREBASE_SERVICE_ACCOUNT không hợp lệ: ${err.message}`);
}

export const fcmEnabled = Boolean(messaging);
export const FCM_PREFIX = 'fcm:'; // lưu trong push_subscriptions.endpoint để không cần migration mới

const DEAD = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

// payload: { title, body, tag, severity }. Trả về danh sách token đã chết để xóa.
export async function sendFcm(tokens, payload) {
  if (!messaging || !tokens.length) return [];
  const critical = payload.severity === 'critical';
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body || '' },
    data: { severity: String(payload.severity ?? ''), tag: String(payload.tag ?? '') },
    android: {
      priority: 'high',
      ttl: 3600 * 1000,
      notification: {
        channelId: critical ? 'alarm' : 'events',
        tag: payload.tag,
        sound: 'default',
        defaultVibrateTimings: true,
        defaultSound: true,
        notificationPriority: critical ? 'PRIORITY_MAX' : 'PRIORITY_DEFAULT',
        visibility: 'PUBLIC',
      },
    },
  });
  const dead = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    if (DEAD.has(r.error?.code)) dead.push(tokens[i]);
    else console.warn(`[FCM] Không gửi được: ${r.error?.code} ${r.error?.message}`);
  });
  return dead;
}
