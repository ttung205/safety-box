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
