<script setup>
import Button from 'primevue/button';
import Message from 'primevue/message';
import { onBeforeUnmount, ref, watch } from 'vue';
import { formatDateTime } from '../lib/format.js';
import { describeMeta } from '../lib/labels.js';
import { alarmingDevices, store } from '../lib/store.js';

// Banner cố định khi có két đang báo động; tự ẩn khi két gửi ALARM_RESET (trạng thái về LOCKED).
const muted = ref(false);
let audioCtx = null;
let timer = null;

function beep() {
  audioCtx ??= new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.setValueAtTime(660, t + 0.25);
  gain.gain.setValueAtTime(0.06, t);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

watch(
  () => alarmingDevices.value.length > 0 && !muted.value,
  (ring) => {
    clearInterval(timer);
    timer = ring ? setInterval(beep, 1200) : null;
    if (ring) beep();
  },
  { immediate: true },
);

// Có báo động mới thì bật lại âm thanh.
watch(
  () => alarmingDevices.value.length,
  (n, prev) => {
    if (n > (prev ?? 0)) muted.value = false;
  },
);

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div v-if="alarmingDevices.length" class="sticky top-14 z-10 bg-slate-50">
    <div class="max-w-7xl mx-auto px-6 pt-4 flex flex-col gap-2">
      <Message v-for="d in alarmingDevices" :key="d.id" severity="error" icon="pi pi-exclamation-triangle">
        <div class="flex flex-wrap items-center gap-3 w-full">
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <span class="font-semibold">
              Báo động tại {{ d.name }}: {{ store.lastAlarm[d.id]?.message ?? 'két đang ở trạng thái báo động' }}
            </span>
            <span class="text-xs">
              <template v-if="store.lastAlarm[d.id]">
                {{ formatDateTime(store.lastAlarm[d.id].occurredAt) }}
                <template v-if="describeMeta(store.lastAlarm[d.id].meta)"> · {{ describeMeta(store.lastAlarm[d.id].meta) }}</template>
                ·
              </template>
              Quẹt thẻ Admin tại két để tắt báo động.
            </span>
          </div>
          <Button
            :label="muted ? 'Bật âm thanh' : 'Tắt âm thanh'"
            :icon="muted ? 'pi pi-volume-up' : 'pi pi-volume-off'"
            size="small"
            severity="danger"
            outlined
            @click="muted = !muted"
          />
        </div>
      </Message>
    </div>
  </div>
</template>
