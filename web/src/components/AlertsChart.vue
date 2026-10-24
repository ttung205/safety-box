<script setup>
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import { computed } from 'vue';

const props = defineProps({ days: { type: Array, default: () => [] } });

const data = computed(() => ({
  labels: props.days.map((d) => d.date.slice(8, 10) + '/' + d.date.slice(5, 7)),
  datasets: [
    { label: 'Nghiêm trọng', data: props.days.map((d) => d.critical), backgroundColor: '#ef4444' },
    { label: 'Cảnh báo', data: props.days.map((d) => d.warning), backgroundColor: '#f59e0b' },
    // Sự kiện thông thường nhiều hơn hẳn nên ẩn mặc định; bấm chú thích để hiện.
    { label: 'Thông tin', data: props.days.map((d) => d.info), backgroundColor: '#cbd5e1', hidden: true },
  ],
}));

const options = {
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, color: '#475569' } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', autoSkip: true, maxRotation: 0 } },
    y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: '#64748b' }, grid: { color: '#e2e8f0' } },
  },
};
</script>

<template>
  <Card class="border border-slate-200">
    <template #content>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 class="m-0 text-base font-semibold text-slate-900">Cảnh báo theo ngày</h4>
          <span class="text-xs text-slate-500">{{ days.length }} ngày gần nhất, giờ Việt Nam</span>
        </div>
        <Chart type="bar" :data="data" :options="options" class="h-56 md:h-72" />
      </div>
    </template>
  </Card>
</template>
