<script setup>
import DatePicker from 'primevue/datepicker';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { isMobile } from '../lib/breakpoint.js';
import { EVENT_TYPES, SEVERITIES } from '../lib/labels.js';

// Dùng chung cho thanh lọc trên máy tính và Drawer trên điện thoại; sửa trực tiếp object `filters` của trang cha.
defineProps({
  filters: { type: Object, required: true },
  devices: { type: Array, default: () => [] },
});

const typeOptions = Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }));
const severityOptions = Object.entries(SEVERITIES).map(([value, s]) => ({ value, label: s.label }));
const size = () => (isMobile.value ? undefined : 'small');
</script>

<template>
  <MultiSelect
    v-model="filters.types"
    :options="typeOptions"
    option-label="label"
    option-value="value"
    placeholder="Loại sự kiện"
    :max-selected-labels="2"
    selected-items-label="{0} loại sự kiện"
    show-clear
    :size="size()"
    class="w-full md:w-56"
  />
  <Select
    v-model="filters.severity"
    :options="severityOptions"
    option-label="label"
    option-value="value"
    placeholder="Mức độ"
    show-clear
    :size="size()"
    class="w-full md:w-40"
  />
  <Select
    v-if="devices.length > 1"
    v-model="filters.deviceId"
    :options="devices"
    option-label="name"
    option-value="id"
    placeholder="Tất cả két"
    show-clear
    :size="size()"
    class="w-full md:w-44"
  />
  <DatePicker
    v-model="filters.range"
    selection-mode="range"
    :manual-input="false"
    date-format="dd/mm/yy"
    placeholder="Khoảng ngày"
    show-icon
    show-button-bar
    :size="size()"
    class="w-full md:w-60"
  />
</template>
