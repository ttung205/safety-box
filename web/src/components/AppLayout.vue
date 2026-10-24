<script setup>
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth, logout } from '../lib/auth.js';
import { describeMeta, typeLabel } from '../lib/labels.js';
import { connected, useSocketEvent } from '../lib/socket.js';
import { loadDevices } from '../lib/store.js';
import AlarmBanner from './AlarmBanner.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const nav = [
  { name: 'dashboard', label: 'Tổng quan', icon: 'pi pi-th-large' },
  { name: 'cards', label: 'Quản lý thẻ', icon: 'pi pi-id-card' },
];

const notifySupported = 'Notification' in window && window.isSecureContext;
const notifyPermission = ref(notifySupported ? Notification.permission : 'denied');

async function enableNotifications() {
  notifyPermission.value = await Notification.requestPermission();
}

async function doLogout() {
  await logout();
  router.replace({ name: 'login' });
}

loadDevices().catch((err) => toast.add({ severity: 'error', summary: 'Không tải được danh sách két', detail: err.message, life: 6000 }));

// Mỗi sự kiện cảnh báo / nghiêm trọng mới: hiện Toast, và thông báo trình duyệt nếu đang ở tab khác.
useSocketEvent('event:created', (e) => {
  if (e.severity === 'info') return;
  const critical = e.severity === 'critical';
  const summary = `${typeLabel(e.type)} · ${e.deviceName}`;
  const detail = [e.message, describeMeta(e.meta)].filter(Boolean).join(' – ');
  toast.add({ severity: critical ? 'error' : 'warn', summary, detail, life: critical ? 15000 : 6000 });
  if (document.hidden && notifyPermission.value === 'granted') {
    new Notification(summary, { body: detail, tag: `event-${e.id}`, requireInteraction: critical });
  }
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
        <RouterLink to="/" class="flex items-center gap-2 font-semibold text-slate-900 no-underline">
          <i class="pi pi-shield text-indigo-600" />
          <span class="hidden sm:inline">Két sắt thông minh</span>
        </RouterLink>
        <nav class="flex items-center gap-1">
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
          <span class="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span class="w-2 h-2 rounded-full" :class="connected ? 'bg-green-500' : 'bg-slate-300'" />
            {{ connected ? 'Đang cập nhật trực tiếp' : 'Mất kết nối máy chủ' }}
          </span>
          <Button
            v-if="notifySupported && notifyPermission === 'default'"
            label="Bật thông báo"
            icon="pi pi-bell"
            size="small"
            severity="secondary"
            outlined
            @click="enableNotifications"
          />
          <span class="hidden md:inline text-sm text-slate-700">{{ auth.user?.name }}</span>
          <Button label="Đăng xuất" icon="pi pi-sign-out" size="small" severity="secondary" text @click="doLogout" />
        </div>
      </div>
    </header>

    <AlarmBanner />

    <main class="w-full max-w-7xl mx-auto p-6">
      <RouterView />
    </main>
  </div>
</template>
