<script setup>
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import { computed, ref } from 'vue';
import { isMobile } from '../lib/breakpoint.js';
import { formatUptime, rssiLabel, timeAgo } from '../lib/format.js';
import { stateOf } from '../lib/labels.js';
import { store } from '../lib/store.js';

const props = defineProps({ device: { type: Object, required: true } });
const state = computed(() => stateOf(props.device.state));
// Điện thoại: ẩn bớt thông số kỹ thuật, bấm "Xem chi tiết" mới hiện.
const expanded = ref(false);
const showAll = computed(() => expanded.value || !isMobile.value);
const alarm = computed(() => props.device.state === 'ALARM');

// Pin dự phòng: chỉ hiện khi két có gắn mạch đo và đã gửi số liệu.
const hasBatt = computed(() => props.device.battPct != null);
const battColor = computed(() => {
  const p = props.device.battPct;
  return p >= 50 ? 'bg-green-500' : p >= 20 ? 'bg-amber-500' : 'bg-red-500';
});
// Mất kết nối khi đang chạy pin: nhiều khả năng két đã hết pin.
const maybeDead = computed(() => !props.device.online && props.device.onBattery === true);
</script>

<template>
  <Card class="border" :class="alarm ? 'border-red-400' : 'border-slate-200'">
    <template #content>
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-1 min-w-0">
            <span class="text-base font-semibold text-slate-900 truncate">{{ device.name }}</span>
            <span class="text-xs text-slate-500">Mã két #{{ device.id }} · Firmware {{ device.fw ?? '—' }}</span>
          </div>
          <span
            class="flex items-center gap-2 text-xs font-medium whitespace-nowrap"
            :class="device.online ? 'text-green-700' : 'text-slate-500'"
          >
            <span class="w-2 h-2 rounded-full" :class="device.online ? 'bg-green-500' : 'bg-slate-300'" />
            {{ device.online ? 'Trực tuyến' : 'Mất kết nối' }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <Tag :value="state.label" :icon="state.icon" :severity="state.tag" class="text-sm px-3 py-1" />
          <span v-if="!device.online && device.state" class="text-xs text-slate-500">Trạng thái ghi nhận cuối cùng</span>
        </div>

        <div v-if="hasBatt" class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-xs text-slate-500">Pin dự phòng</span>
            <span class="flex items-center gap-2 tabular-nums font-medium">
              {{ device.battPct }}%
              <Tag
                v-if="device.onBattery != null"
                :value="device.onBattery ? 'Đang chạy pin' : 'Đang cắm điện'"
                :severity="device.onBattery ? 'warn' : 'success'"
                class="text-xs"
              />
            </span>
          </div>
          <div class="h-2 w-full rounded-full bg-slate-200 overflow-hidden" role="progressbar" :aria-valuenow="device.battPct" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full rounded-full transition-all" :class="battColor" :style="{ width: `${device.battPct}%` }" />
          </div>
          <span v-if="maybeDead" class="text-xs text-red-600 font-medium">
            Két mất kết nối khi đang chạy pin, có thể pin đã hết.
          </span>
          <span v-else-if="device.battPct < 20" class="text-xs text-red-600 font-medium">
            Pin yếu, hãy cắm điện cho két.
          </span>
        </div>

        <Divider class="m-0" />

        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 m-0 text-sm">
          <div class="flex flex-col gap-1">
            <dt class="text-xs text-slate-500">Tín hiệu gần nhất</dt>
            <dd class="m-0 tabular-nums">{{ timeAgo(device.lastSeenAt, store.now) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-xs text-slate-500">WiFi</dt>
            <dd class="m-0 tabular-nums">{{ rssiLabel(device.rssi) }}</dd>
          </div>
          <div v-show="showAll" class="flex flex-col gap-1">
            <dt class="text-xs text-slate-500">Địa chỉ IP</dt>
            <dd class="m-0 tabular-nums">{{ device.ip ?? '—' }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-xs text-slate-500">Thời gian hoạt động</dt>
            <dd class="m-0 tabular-nums">{{ formatUptime(device.uptime) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-xs text-slate-500">Đồng hồ</dt>
            <dd class="m-0" :class="device.timeOk === false ? 'text-red-600 font-medium' : ''">
              {{ device.timeOk == null ? '—' : device.timeOk ? 'Đã đồng bộ' : 'Chưa có giờ, OTP sẽ báo sai' }}
            </dd>
          </div>
          <div v-show="showAll" class="flex flex-col gap-1">
            <dt class="text-xs text-slate-500">Bộ nhớ trống</dt>
            <dd class="m-0 tabular-nums">{{ device.freeHeap ? `${Math.round(device.freeHeap / 1024)} KB` : '—' }}</dd>
          </div>
        </dl>

        <Button
          class="md:hidden self-start"
          :label="expanded ? 'Thu gọn' : 'Xem chi tiết'"
          :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          size="small"
          severity="secondary"
          text
          @click="expanded = !expanded"
        />
      </div>
    </template>
  </Card>
</template>
