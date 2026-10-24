<script setup>
import Card from 'primevue/card';
import Message from 'primevue/message';
import { computed, onMounted, ref } from 'vue';
import AlertsChart from '../components/AlertsChart.vue';
import DeviceCard from '../components/DeviceCard.vue';
import EventTable from '../components/EventTable.vue';
import { api } from '../lib/api.js';
import { isMobile } from '../lib/breakpoint.js';
import { formatDateTime } from '../lib/format.js';
import { useResync, useSocketEvent } from '../lib/socket.js';
import { store } from '../lib/store.js';

const stats = ref({ days: [], today: { critical: 0, warning: 0, info: 0 }, lastAlarm: null });

async function loadStats() {
  stats.value = await api('/dash-api/stats', { query: { days: 14 } }).catch(() => stats.value);
}

// Nhiều sự kiện tới dồn dập (gửi bù sau khi mất mạng) thì chỉ tải lại thống kê một lần.
let statsTimer = null;
useSocketEvent('event:created', () => {
  clearTimeout(statsTimer);
  statsTimer = setTimeout(loadStats, 1000);
});
useResync(loadStats);
onMounted(loadStats);

const tiles = computed(() => [
  {
    label: 'Báo động hôm nay',
    short: 'Báo động',
    value: stats.value.today.critical,
    color: stats.value.today.critical ? 'text-red-600' : 'text-slate-900',
    note: stats.value.lastAlarm
      ? `Lần gần nhất: ${formatDateTime(stats.value.lastAlarm.occurredAt)}`
      : 'Chưa ghi nhận báo động nào',
  },
  {
    label: 'Cảnh báo hôm nay',
    short: 'Cảnh báo',
    value: stats.value.today.warning,
    color: stats.value.today.warning ? 'text-amber-600' : 'text-slate-900',
    note: 'Thẻ lạ, nhập sai OTP, hết thời gian OTP',
  },
  {
    label: 'Sự kiện thông thường hôm nay',
    short: 'Thông thường',
    value: stats.value.today.info,
    color: 'text-slate-900',
    note: 'Mở/khóa két, quẹt thẻ Admin, rung nhẹ',
  },
]);
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold text-slate-900">Tổng quan két sắt</h1>
      <p class="hidden md:block m-0 text-xs text-slate-500">Trạng thái két, cảnh báo và nhật ký sự kiện được cập nhật trực tiếp.</p>
    </div>

    <Message v-if="store.devicesLoaded && !store.devices.length" severity="info">
      Chưa có két nào trong hệ thống. Chạy lệnh <code>npm run device:create -- "Ket sat 01"</code> trong thư mục
      <code>server</code> để tạo khóa thiết bị, rồi dán vào DEVICE_KEY của firmware.
    </Message>

    <div v-if="store.devices.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DeviceCard v-for="d in store.devices" :key="d.id" :device="d" />
    </div>

    <div class="grid grid-cols-3 gap-2 md:gap-4">
      <Card v-for="t in tiles" :key="t.label" class="border border-slate-200">
        <template #content>
          <div class="flex flex-col gap-1">
            <span class="text-xs md:text-sm text-slate-500">
              <span class="md:hidden">{{ t.short }}</span>
              <span class="hidden md:inline">{{ t.label }}</span>
            </span>
            <span class="text-2xl md:text-3xl font-bold tabular-nums" :class="t.color">{{ t.value }}</span>
            <span class="hidden md:block text-xs text-slate-500">{{ t.note }}</span>
          </div>
        </template>
      </Card>
    </div>

    <AlertsChart :days="isMobile ? stats.days.slice(-7) : stats.days" />
    <EventTable :devices="store.devices" />
  </div>
</template>
