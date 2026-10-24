<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Menu from 'primevue/menu';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth, logout } from '../lib/auth.js';
import { describeMeta, typeLabel } from '../lib/labels.js';
import {
  applyUpdate,
  canInstall,
  disablePush,
  enablePush,
  installApp,
  needRefresh,
  online,
  pushState,
  syncPush,
} from '../lib/pwa.js';
import { connected, useSocketEvent } from '../lib/socket.js';
import { loadDevices } from '../lib/store.js';
import AlarmBanner from './AlarmBanner.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const menu = ref();
const iosGuide = ref(false);

const nav = [
  { name: 'dashboard', label: 'Tổng quan', icon: 'pi pi-th-large' },
  { name: 'cards', label: 'Quản lý thẻ', icon: 'pi pi-id-card' },
];

const fail = (summary, err) => toast.add({ severity: 'error', summary, detail: err.message, life: 6000 });

async function turnOnPush() {
  if (pushState.value === 'needs-install') {
    iosGuide.value = true;
    return;
  }
  try {
    await enablePush();
    toast.add({ severity: 'success', summary: 'Đã bật thông báo', detail: 'Điện thoại sẽ nhận báo động kể cả khi đã đóng ứng dụng.', life: 5000 });
  } catch (err) {
    fail('Không bật được thông báo', err);
  }
}

async function turnOffPush() {
  try {
    await disablePush();
    toast.add({ severity: 'info', summary: 'Đã tắt thông báo', detail: 'Thiết bị này sẽ không nhận báo động khi đóng ứng dụng.', life: 4000 });
  } catch (err) {
    fail('Không tắt được thông báo', err);
  }
}

async function doInstall() {
  if ((await installApp()) === 'ios') iosGuide.value = true;
}

async function doLogout() {
  // Hủy đăng ký thông báo khi còn token, để thiết bị này không nhận báo động sau khi đăng xuất.
  await disablePush().catch(() => {});
  await logout();
  router.replace({ name: 'login' });
}

const pushItem = computed(() => {
  if (pushState.value === 'on') return { label: 'Tắt thông báo', icon: 'pi pi-bell-slash', command: turnOffPush };
  if (pushState.value === 'off' || pushState.value === 'needs-install') return { label: 'Bật thông báo', icon: 'pi pi-bell', command: turnOnPush };
  if (pushState.value === 'denied') return { label: 'Thông báo đang bị chặn', icon: 'pi pi-ban', disabled: true };
  return null;
});

const menuItems = computed(() => [
  { label: auth.user?.name || auth.user?.email, icon: 'pi pi-user', disabled: true },
  { separator: true },
  ...(pushItem.value ? [pushItem.value] : []),
  ...(canInstall.value ? [{ label: 'Cài ứng dụng', icon: 'pi pi-download', command: doInstall }] : []),
  { label: 'Đăng xuất', icon: 'pi pi-sign-out', command: doLogout },
]);

onMounted(syncPush);
loadDevices().catch((err) => fail('Không tải được danh sách két', err));

// Có mạng trở lại: tải lại dữ liệu bị lỡ khi offline.
watch(online, (isOnline) => isOnline && loadDevices().catch(() => {}));

// Sự kiện cảnh báo / nghiêm trọng mới: hiện Toast. Khi đóng app, thông báo hệ thống do Web Push (sw.js) đảm nhiệm.
useSocketEvent('event:created', (e) => {
  if (e.severity === 'info') return;
  const critical = e.severity === 'critical';
  const summary = `${typeLabel(e.type)} · ${e.deviceName}`;
  const detail = [e.message, describeMeta(e.meta)].filter(Boolean).join(' – ');
  toast.add({ severity: critical ? 'error' : 'warn', summary, detail, life: critical ? 15000 : 6000 });
});
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <header class="sticky top-0 z-20 bg-white border-b border-slate-200 pt-[env(safe-area-inset-top)]">
      <div class="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4 md:gap-6">
        <RouterLink to="/" class="flex items-center gap-2 font-semibold text-slate-900 no-underline">
          <i class="pi pi-shield text-indigo-600" />
          <span>Két sắt thông minh</span>
        </RouterLink>
        <nav class="hidden md:flex items-center gap-1">
          <Button
            v-for="item in nav"
            :key="item.name"
            :label="item.label"
            :icon="item.icon"
            size="small"
            text
            :severity="route.name === item.name ? 'primary' : 'secondary'"
            :class="route.name === item.name ? 'bg-indigo-50' : ''"
            @click="router.push({ name: item.name })"
          />
        </nav>

        <div class="ml-auto flex items-center gap-3">
          <span class="flex items-center gap-2 text-xs text-slate-500" :aria-label="connected ? 'Đang cập nhật trực tiếp' : 'Mất kết nối máy chủ'">
            <span class="w-2 h-2 rounded-full" :class="connected ? 'bg-green-500' : 'bg-slate-300'" />
            <span class="hidden md:inline">{{ connected ? 'Đang cập nhật trực tiếp' : 'Mất kết nối máy chủ' }}</span>
          </span>

          <!-- Máy tính: các nút hiện sẵn -->
          <div class="hidden md:flex items-center gap-3">
            <Button
              v-if="pushItem && !pushItem.disabled"
              :label="pushItem.label"
              :icon="pushItem.icon"
              size="small"
              severity="secondary"
              :outlined="pushState !== 'on'"
              :text="pushState === 'on'"
              @click="pushItem.command"
            />
            <Button v-if="canInstall" label="Cài ứng dụng" icon="pi pi-download" size="small" severity="secondary" outlined @click="doInstall" />
            <span class="text-sm text-slate-700">{{ auth.user?.name }}</span>
            <Button label="Đăng xuất" icon="pi pi-sign-out" size="small" severity="secondary" text @click="doLogout" />
          </div>

          <!-- Điện thoại: gom vào menu -->
          <Button
            class="md:hidden"
            icon="pi pi-ellipsis-v"
            severity="secondary"
            text
            aria-label="Mở menu"
            aria-haspopup="true"
            @click="menu.toggle($event)"
          />
          <Menu ref="menu" :model="menuItems" popup />
        </div>
      </div>
    </header>

    <AlarmBanner />

    <div v-if="!online || needRefresh" class="w-full max-w-7xl mx-auto px-4 md:px-6 pt-4 flex flex-col gap-2">
      <Message v-if="!online" severity="warn" icon="pi pi-wifi">
        Mất kết nối mạng. Dữ liệu sẽ tự cập nhật khi có mạng trở lại.
      </Message>
      <Message v-if="needRefresh" severity="info" icon="pi pi-sync">
        <div class="flex flex-wrap items-center gap-3">
          <span>Đã có phiên bản mới của ứng dụng.</span>
          <Button label="Cập nhật" size="small" @click="applyUpdate" />
        </div>
      </Message>
    </div>

    <main class="w-full max-w-7xl mx-auto p-4 pb-24 md:p-6">
      <RouterView />
    </main>

    <!-- Điện thoại: thanh điều hướng dưới -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div class="flex">
        <Button
          v-for="item in nav"
          :key="item.name"
          :label="item.label"
          :icon="item.icon"
          icon-pos="top"
          text
          :severity="route.name === item.name ? 'primary' : 'secondary'"
          :class="route.name === item.name ? 'flex-1 bg-indigo-50' : 'flex-1'"
          @click="router.push({ name: item.name })"
        />
      </div>
    </nav>

    <Dialog v-model:visible="iosGuide" header="Cài ứng dụng lên màn hình chính" modal :draggable="false" class="w-full max-w-md" :breakpoints="{ '767px': '92vw' }">
      <ol class="m-0 pl-5 flex flex-col gap-3 text-sm text-slate-700">
        <li>Mở trang này bằng <b>Safari</b>.</li>
        <li>Bấm nút <b>Chia sẻ</b> <i class="pi pi-share-alt" /> ở thanh công cụ.</li>
        <li>Chọn <b>Thêm vào MH chính</b>, rồi bấm <b>Thêm</b>.</li>
        <li>Mở ứng dụng “Két sắt” từ màn hình chính, sau đó bật thông báo trong menu <i class="pi pi-ellipsis-v" />.</li>
      </ol>
      <template #footer>
        <Button label="Đã hiểu" @click="iosGuide = false" />
      </template>
    </Dialog>
  </div>
</template>
