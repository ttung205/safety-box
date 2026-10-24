<script setup>
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { useResync, useSocketEvent } from '../lib/socket.js';
import { store } from '../lib/store.js';

const MAX_CARDS = 20; // = MAX_CARDS trong firmware
const SCAN_TIMEOUT_MS = 60000;
const toast = useToast();
const confirm = useConfirm();

const deviceId = ref(null);
const cards = ref([]);
const loading = ref(false);
const device = computed(() => store.devices.find((item) => item.id === deviceId.value));

watch(
  () => store.devices.length,
  () => {
    if (!device.value && store.devices.length) deviceId.value = store.devices[0].id;
  },
  { immediate: true },
);

async function loadCards() {
  if (!deviceId.value) return;
  loading.value = true;
  try {
    cards.value = await api('/dash-api/cards', { query: { deviceId: deviceId.value } });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Không tải được danh sách thẻ', detail: err.message, life: 6000 });
  } finally {
    loading.value = false;
  }
}
watch(deviceId, loadCards, { immediate: true });

useSocketEvent('cards:updated', (event) => event.deviceId === deviceId.value && loadCards());
useResync(loadCards);

const dialog = reactive({
  visible: false,
  mode: 'add',
  step: 'form',
  id: null,
  name: '',
  error: '',
  saving: false,
  scanStartedAt: 0,
  scanAfterId: 0,
  secondsLeft: 60,
});

let countdownTimer = null;
let pollTimer = null;
let completingScan = false;

const dialogTitle = computed(() => (dialog.mode === 'rename' ? 'Đổi tên chủ thẻ' : dialog.step === 'scan' ? 'Quẹt thẻ vào két' : 'Thêm thẻ mới'));

function stopScanning() {
  if (countdownTimer) clearInterval(countdownTimer);
  if (pollTimer) clearInterval(pollTimer);
  countdownTimer = null;
  pollTimer = null;
  completingScan = false;
}

function closeDialog() {
  stopScanning();
  dialog.visible = false;
}

function openAddDialog() {
  stopScanning();
  Object.assign(dialog, { visible: true, mode: 'add', step: 'form', id: null, name: '', error: '', saving: false, secondsLeft: 60 });
}

function openRenameDialog(card) {
  stopScanning();
  Object.assign(dialog, { visible: true, mode: 'rename', step: 'form', id: card.id, name: card.name, error: '', saving: false });
}

async function completeScan(uid) {
  if (!uid || dialog.step !== 'scan' || completingScan) return;
  completingScan = true;
  dialog.saving = true;
  dialog.error = '';
  try {
    const card = await api('/dash-api/cards', {
      method: 'POST',
      body: { deviceId: deviceId.value, uid, name: dialog.name.trim() },
    });
    toast.add({
      severity: 'success',
      summary: 'Đã thêm thẻ',
      detail: `Đã cấp quyền cho “${card.name}”. Két sẽ nhận danh sách mới trong tối đa 30 giây.`,
      life: 6000,
    });
    closeDialog();
    await loadCards();
  } catch (err) {
    stopScanning();
    dialog.saving = false;
    dialog.step = 'form';
    dialog.error = err.message;
  }
}

async function pollScannedCard() {
  if (dialog.step !== 'scan' || completingScan) return;
  try {
    const result = await api('/dash-api/events', {
      query: { type: 'CARD_UNKNOWN', deviceId: deviceId.value, pageSize: 5 },
    });
    const event = result.items.find((item) => item.id > dialog.scanAfterId && item.meta?.uid);
    if (event) await completeScan(event.meta.uid);
  } catch {
    // Realtime vẫn là đường chính; lần polling sau sẽ thử lại.
  }
}

async function startScanning() {
  dialog.error = '';
  const name = dialog.name.trim();
  if (!name) {
    dialog.error = 'Vui lòng nhập tên chủ thẻ.';
    return;
  }
  if (!device.value?.online) {
    dialog.error = 'Két đang mất kết nối. Hãy bật két và chờ trạng thái trực tuyến trước khi thêm thẻ.';
    return;
  }

  dialog.name = name;
  dialog.saving = true;
  try {
    const latest = await api('/dash-api/events', {
      query: { type: 'CARD_UNKNOWN', deviceId: deviceId.value, pageSize: 1 },
    });
    dialog.scanAfterId = latest.items[0]?.id ?? 0;
  } catch (err) {
    dialog.error = `Không thể bắt đầu quét: ${err.message}`;
    dialog.saving = false;
    return;
  }
  dialog.saving = false;
  dialog.step = 'scan';
  dialog.scanStartedAt = Date.now();
  dialog.secondsLeft = Math.ceil(SCAN_TIMEOUT_MS / 1000);
  countdownTimer = setInterval(() => {
    const elapsed = Date.now() - dialog.scanStartedAt;
    dialog.secondsLeft = Math.max(0, Math.ceil((SCAN_TIMEOUT_MS - elapsed) / 1000));
    if (elapsed >= SCAN_TIMEOUT_MS) {
      stopScanning();
      dialog.step = 'form';
      dialog.error = 'Hết thời gian chờ. Nhấn “Bắt đầu quét” để thử lại.';
    }
  }, 1000);
  pollTimer = setInterval(pollScannedCard, 2000);
}

async function submitDialog() {
  if (dialog.mode === 'add') return startScanning();
  dialog.error = '';
  dialog.saving = true;
  try {
    await api(`/dash-api/cards/${dialog.id}`, { method: 'PATCH', body: { name: dialog.name } });
    toast.add({ severity: 'success', summary: 'Đã lưu thay đổi', detail: `Tên chủ thẻ đã đổi thành “${dialog.name.trim()}”.`, life: 4000 });
    closeDialog();
    await loadCards();
  } catch (err) {
    dialog.error = err.message;
  } finally {
    dialog.saving = false;
  }
}

useSocketEvent('event:created', (event) => {
  if (
    dialog.visible &&
    dialog.mode === 'add' &&
    dialog.step === 'scan' &&
    event.deviceId === deviceId.value &&
    event.type === 'CARD_UNKNOWN' &&
    event.id > dialog.scanAfterId
  ) {
    completeScan(event.meta?.uid);
  }
});

watch(
  () => dialog.visible,
  (visible) => {
    if (!visible) stopScanning();
  },
);
onBeforeUnmount(stopScanning);

function confirmDelete(card) {
  confirm.require({
    header: 'Xác nhận xóa thẻ',
    message: `Thu hồi quyền mở két của “${card.name}”? Két sẽ nhận thay đổi trong tối đa 30 giây.`,
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Xóa thẻ', severity: 'danger' },
    rejectProps: { label: 'Hủy bỏ', severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await api(`/dash-api/cards/${card.id}`, { method: 'DELETE' });
        toast.add({ severity: 'success', summary: 'Đã xóa thẻ', detail: `Đã thu hồi quyền của “${card.name}”.`, life: 4000 });
        await loadCards();
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Không xóa được thẻ', detail: err.message, life: 6000 });
      }
    },
  });
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold text-slate-900">Quản lý thẻ Admin</h1>
      <p class="m-0 text-xs text-slate-500">Thêm thẻ bằng cách quẹt trực tiếp vào két; người dùng không cần biết UID.</p>
    </div>

    <Message v-if="store.devicesLoaded && !store.devices.length" severity="info">
      Chưa có két nào trong hệ thống. Hãy kết nối thiết bị trước khi thêm thẻ.
    </Message>

    <Card v-else class="border border-slate-200">
      <template #content>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <Select
              v-model="deviceId"
              :options="store.devices"
              option-label="name"
              option-value="id"
              placeholder="Chọn két"
              size="small"
              class="w-52"
            />
            <span class="text-sm text-slate-500 tabular-nums">
              {{ cards.length }}/{{ MAX_CARDS }} thẻ
              <template v-if="device"> · {{ device.online ? 'Két trực tuyến' : 'Két mất kết nối' }}</template>
            </span>
            <Button
              label="Thêm thẻ mới"
              icon="pi pi-plus"
              size="small"
              class="ml-auto"
              :disabled="!deviceId || cards.length >= MAX_CARDS"
              @click="openAddDialog"
            />
          </div>

          <DataTable :value="cards" :loading="loading" data-key="id" size="small">
            <template #empty>
              <div class="py-8 text-center text-sm text-slate-500">
                Chưa có thẻ nào. Nhấn “Thêm thẻ mới”, nhập tên rồi quẹt thẻ vào đầu đọc RFID.
              </div>
            </template>
            <Column field="name" header="Chủ thẻ">
              <template #body="{ data }">
                <span class="font-medium text-slate-900">{{ data.name }}</span>
              </template>
            </Column>
            <Column header="Ngày thêm" class="whitespace-nowrap">
              <template #body="{ data }">
                <span class="tabular-nums text-slate-700">{{ formatDateTime(data.createdAt) }}</span>
              </template>
            </Column>
            <Column header="" class="w-0">
              <template #body="{ data }">
                <div class="flex justify-end gap-1">
                  <Button label="Đổi tên" icon="pi pi-pencil" size="small" severity="secondary" text @click="openRenameDialog(data)" />
                  <Button label="Xóa" icon="pi pi-trash" size="small" severity="danger" text @click="confirmDelete(data)" />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </Card>

    <Dialog v-model:visible="dialog.visible" :header="dialogTitle" modal :draggable="false" :closable="!dialog.saving" class="w-full max-w-md">
      <form v-if="dialog.step === 'form'" id="card-form" class="flex flex-col gap-4" @submit.prevent="submitDialog">
        <Message v-if="dialog.error" severity="error" size="small">{{ dialog.error }}</Message>
        <div class="flex flex-col gap-2">
          <label for="card-name" class="text-sm font-medium text-slate-700">Tên chủ thẻ</label>
          <InputText id="card-name" v-model="dialog.name" placeholder="Ví dụ: Nguyễn Văn A" maxlength="60" autofocus fluid />
          <small v-if="dialog.mode === 'add'" class="text-xs text-slate-500">Sau bước này, web sẽ yêu cầu bạn quẹt thẻ vào két.</small>
        </div>
      </form>

      <div v-else class="flex flex-col items-center gap-4 py-5 text-center">
        <i class="pi pi-id-card text-5xl text-indigo-600" />
        <div>
          <div class="text-lg font-semibold text-slate-900">Quẹt thẻ mới vào đầu đọc RFID</div>
          <p class="mt-2 mb-0 text-sm text-slate-600">Đang chờ két {{ device?.name }} phản hồi · còn {{ dialog.secondsLeft }} giây</p>
        </div>
        <i v-if="dialog.saving" class="pi pi-spin pi-spinner text-xl text-indigo-600" />
        <Message v-if="dialog.error" severity="error" size="small" class="w-full">{{ dialog.error }}</Message>
      </div>

      <template #footer>
        <Button label="Hủy bỏ" severity="secondary" outlined :disabled="dialog.saving" @click="closeDialog" />
        <Button
          v-if="dialog.step === 'form'"
          type="submit"
          form="card-form"
          :label="dialog.mode === 'add' ? 'Bắt đầu quét' : 'Lưu thay đổi'"
          :icon="dialog.mode === 'add' ? 'pi pi-wifi' : 'pi pi-check'"
          :loading="dialog.saving"
        />
      </template>
    </Dialog>
  </div>
</template>
