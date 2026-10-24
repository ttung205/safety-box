<script setup>
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api, buildUrl } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { EVENT_TYPES, SEVERITIES, describeMeta, severityOf, typeLabel } from '../lib/labels.js';
import { useResync, useSocketEvent } from '../lib/socket.js';

const props = defineProps({ devices: { type: Array, default: () => [] } });

const PAGE_SIZE = 20;
const toast = useToast();
const items = ref([]);
const total = ref(0);
const first = ref(0);
const loading = ref(false);
const freshIds = ref(new Set());
const filters = reactive({ types: [], severity: null, deviceId: null, range: null });

const typeOptions = Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }));
const severityOptions = Object.entries(SEVERITIES).map(([value, s]) => ({ value, label: s.label }));
const hasFilters = computed(() => filters.types.length || filters.severity || filters.deviceId || filters.range);

function query() {
  const [start, end] = filters.range ?? [];
  const to = end ?? start;
  return {
    type: filters.types,
    severity: filters.severity,
    deviceId: filters.deviceId,
    from: start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString() : undefined,
    to: to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).toISOString() : undefined,
  };
}

async function load() {
  loading.value = true;
  try {
    const res = await api('/dash-api/events', { query: { ...query(), page: first.value / PAGE_SIZE + 1, pageSize: PAGE_SIZE } });
    items.value = res.items;
    total.value = res.total;
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Không tải được nhật ký sự kiện', detail: err.message, life: 6000 });
  } finally {
    loading.value = false;
  }
}

function onPage(e) {
  first.value = e.first;
  load();
}

function resetFilters() {
  Object.assign(filters, { types: [], severity: null, deviceId: null, range: null });
}

function exportCsv() {
  window.location.href = buildUrl('/dash-api/events/export', query()).toString();
}

function matches(e) {
  const q = query();
  if (q.type.length && !q.type.includes(e.type)) return false;
  if (q.severity && e.severity !== q.severity) return false;
  if (q.deviceId && e.deviceId !== q.deviceId) return false;
  if (q.from && e.occurredAt < q.from) return false;
  if (q.to && e.occurredAt > q.to) return false;
  return true;
}

// Dòng mới chèn lên đầu khi đang xem trang đầu tiên.
useSocketEvent('event:created', (e) => {
  if (!matches(e)) return;
  total.value++;
  if (first.value !== 0) return;
  items.value = [e, ...items.value].slice(0, PAGE_SIZE);
  freshIds.value.add(e.id);
  setTimeout(() => freshIds.value.delete(e.id), 4000);
});
useResync(load);

watch(filters, () => {
  first.value = 0;
  load();
});
onMounted(load);

const rowClass = (row) => (freshIds.value.has(row.id) ? 'bg-indigo-50' : row.severity === 'critical' ? 'bg-red-50' : '');
</script>

<template>
  <Card class="border border-slate-200">
    <template #content>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="m-0 mr-auto text-base font-semibold text-slate-900">Nhật ký sự kiện</h4>
          <MultiSelect
            v-model="filters.types"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            placeholder="Loại sự kiện"
            :max-selected-labels="2"
            selected-items-label="{0} loại sự kiện"
            show-clear
            size="small"
            class="w-56"
          />
          <Select
            v-model="filters.severity"
            :options="severityOptions"
            option-label="label"
            option-value="value"
            placeholder="Mức độ"
            show-clear
            size="small"
            class="w-40"
          />
          <Select
            v-if="devices.length > 1"
            v-model="filters.deviceId"
            :options="devices"
            option-label="name"
            option-value="id"
            placeholder="Tất cả két"
            show-clear
            size="small"
            class="w-44"
          />
          <DatePicker
            v-model="filters.range"
            selection-mode="range"
            :manual-input="false"
            date-format="dd/mm/yy"
            placeholder="Khoảng ngày"
            show-icon
            show-button-bar
            size="small"
            class="w-60"
          />
          <Button
            label="Đặt lại bộ lọc"
            icon="pi pi-filter-slash"
            size="small"
            severity="secondary"
            outlined
            :disabled="!hasFilters"
            @click="resetFilters"
          />
          <Button label="Xuất file CSV" icon="pi pi-download" size="small" severity="secondary" outlined @click="exportCsv" />
        </div>

        <DataTable
          :value="items"
          lazy
          paginator
          :rows="PAGE_SIZE"
          :first="first"
          :total-records="total"
          :loading="loading"
          :row-class="rowClass"
          data-key="id"
          size="small"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
          current-page-report-template="{first}–{last} / {totalRecords} sự kiện"
          @page="onPage"
        >
          <template #empty>
            <div class="py-6 text-center text-sm text-slate-500">
              {{ hasFilters ? 'Không tìm thấy sự kiện phù hợp với bộ lọc hiện tại.' : 'Chưa có sự kiện nào. Két sẽ gửi nhật ký lên ngay khi kết nối WiFi.' }}
            </div>
          </template>
          <Column header="Thời gian" class="whitespace-nowrap">
            <template #body="{ data }">
              <span class="tabular-nums text-slate-700">{{ formatDateTime(data.occurredAt) }}</span>
            </template>
          </Column>
          <Column v-if="devices.length > 1" field="deviceName" header="Két" class="whitespace-nowrap" />
          <Column header="Mức độ">
            <template #body="{ data }">
              <Tag :value="severityOf(data.severity).label" :severity="severityOf(data.severity).tag" />
            </template>
          </Column>
          <Column header="Sự kiện" class="whitespace-nowrap">
            <template #body="{ data }">
              <span class="font-medium">{{ typeLabel(data.type) }}</span>
            </template>
          </Column>
          <Column field="message" header="Nội dung" />
          <Column header="Chi tiết">
            <template #body="{ data }">
              <span class="text-xs text-slate-500">{{ describeMeta(data.meta) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </Card>
</template>
