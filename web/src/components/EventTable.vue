<script setup>
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DataView from 'primevue/dataview';
import Drawer from 'primevue/drawer';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api } from '../lib/api.js';
import { isMobile } from '../lib/breakpoint.js';
import { downloadFile } from '../lib/download.js';
import { formatDateTime } from '../lib/format.js';
import { describeMeta, severityOf, typeLabel } from '../lib/labels.js';
import { useResync, useSocketEvent } from '../lib/socket.js';
import EventFilters from './EventFilters.vue';

const props = defineProps({ devices: { type: Array, default: () => [] } });

const PAGE_SIZE = 20;
const toast = useToast();
const items = ref([]);
const total = ref(0);
const first = ref(0);
const loading = ref(false);
const exporting = ref(false);
const filterOpen = ref(false);
const freshIds = ref(new Set());
const filters = reactive({ types: [], severity: null, deviceId: null, range: null });

const activeFilters = computed(
  () => filters.types.length + [filters.severity, filters.deviceId, filters.range].filter(Boolean).length,
);
const hasFilters = computed(() => activeFilters.value > 0);

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

async function exportCsv() {
  exporting.value = true;
  try {
    await downloadFile('/dash-api/events/export', query(), { share: isMobile.value });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Không xuất được file CSV', detail: err.message, life: 6000 });
  } finally {
    exporting.value = false;
  }
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
const emptyText = computed(() =>
  hasFilters.value
    ? 'Không tìm thấy sự kiện phù hợp với bộ lọc hiện tại.'
    : 'Chưa có sự kiện nào. Két sẽ gửi nhật ký lên ngay khi kết nối WiFi.',
);
</script>

<template>
  <Card class="border border-slate-200">
    <template #content>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="m-0 mr-auto text-base font-semibold text-slate-900">Nhật ký sự kiện</h4>

          <!-- Điện thoại: bộ lọc nằm trong Drawer -->
          <template v-if="isMobile">
            <Button
              label="Bộ lọc"
              icon="pi pi-filter"
              severity="secondary"
              outlined
              :badge="hasFilters ? String(activeFilters) : undefined"
              @click="filterOpen = true"
            />
            <Button
              icon="pi pi-download"
              severity="secondary"
              outlined
              aria-label="Xuất file CSV"
              :loading="exporting"
              @click="exportCsv"
            />
          </template>

          <template v-else>
            <EventFilters :filters="filters" :devices="devices" />
            <Button
              label="Đặt lại bộ lọc"
              icon="pi pi-filter-slash"
              size="small"
              severity="secondary"
              outlined
              :disabled="!hasFilters"
              @click="resetFilters"
            />
            <Button
              label="Xuất file CSV"
              icon="pi pi-download"
              size="small"
              severity="secondary"
              outlined
              :loading="exporting"
              @click="exportCsv"
            />
          </template>
        </div>

        <!-- Điện thoại: danh sách -->
        <DataView
          v-if="isMobile"
          :value="items"
          lazy
          paginator
          :rows="PAGE_SIZE"
          :first="first"
          :total-records="total"
          data-key="id"
          paginator-template="PrevPageLink CurrentPageReport NextPageLink"
          current-page-report-template="{first}–{last} / {totalRecords}"
          @page="onPage"
        >
          <template #empty>
            <div class="py-6 text-center text-sm text-slate-500">
              <i v-if="loading" class="pi pi-spin pi-spinner text-xl text-indigo-600" />
              <template v-else>{{ emptyText }}</template>
            </div>
          </template>
          <template #list="{ items: rows }">
            <div class="flex flex-col">
              <div
                v-for="row in rows"
                :key="row.id"
                class="flex flex-col gap-1 px-2 py-3 border-b border-slate-200"
                :class="rowClass(row)"
              >
                <div class="flex items-center gap-2">
                  <Tag :value="severityOf(row.severity).label" :severity="severityOf(row.severity).tag" />
                  <span class="font-medium text-slate-900 truncate">{{ typeLabel(row.type) }}</span>
                  <span class="ml-auto text-xs text-slate-500 tabular-nums whitespace-nowrap">{{ formatDateTime(row.occurredAt) }}</span>
                </div>
                <span class="text-sm text-slate-700">{{ row.message }}</span>
                <span v-if="describeMeta(row.meta) || devices.length > 1" class="text-xs text-slate-500">
                  <template v-if="devices.length > 1">{{ row.deviceName }}</template>
                  <template v-if="devices.length > 1 && describeMeta(row.meta)"> · </template>
                  {{ describeMeta(row.meta) }}
                </span>
              </div>
            </div>
          </template>
        </DataView>

        <!-- Máy tính: bảng -->
        <DataTable
          v-else
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
            <div class="py-6 text-center text-sm text-slate-500">{{ emptyText }}</div>
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

  <Drawer v-model:visible="filterOpen" position="bottom" header="Bộ lọc sự kiện" class="h-auto max-h-[85dvh]">
    <div class="flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
      <EventFilters :filters="filters" :devices="devices" />
      <div class="flex gap-2">
        <Button label="Đặt lại bộ lọc" icon="pi pi-filter-slash" severity="secondary" outlined class="flex-1" :disabled="!hasFilters" @click="resetFilters" />
        <Button label="Xem kết quả" icon="pi pi-check" class="flex-1" @click="filterOpen = false" />
      </div>
    </div>
  </Drawer>
</template>
