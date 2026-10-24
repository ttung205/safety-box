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
import { computed, reactive, ref, watch } from 'vue';
import { api } from '../lib/api.js';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { useResync, useSocketEvent } from '../lib/socket.js';
import { store } from '../lib/store.js';

const MAX_CARDS = 20; // = MAX_CARDS trong firmware
const toast = useToast();
const confirm = useConfirm();

const deviceId = ref(null);
const cards = ref([]);
const unknown = ref([]);
const loading = ref(false);

const device = computed(() => store.devices.find((d) => d.id === deviceId.value));

// Chọn sẵn két đầu tiên khi danh sách két tải xong.
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
    [cards.value, unknown.value] = await Promise.all([
      api('/dash-api/cards', { query: { deviceId: deviceId.value } }),
      api('/dash-api/cards/unknown', { query: { deviceId: deviceId.value } }),
    ]);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Không tải được danh sách thẻ', detail: err.message, life: 6000 });
  } finally {
    loading.value = false;
  }
}
watch(deviceId, loadCards, { immediate: true });

useSocketEvent('cards:updated', (e) => e.deviceId === deviceId.value && loadCards());
useSocketEvent('event:created', (e) => e.type === 'CARD_UNKNOWN' && e.deviceId === deviceId.value && loadCards());
useResync(loadCards);

// ---- Dialog thêm / cấp quyền / đổi tên ----
const dialog = reactive({ visible: false, mode: 'add', id: null, uid: '', name: '', error: '', saving: false });

const dialogTitle = computed(
  () =>
    ({
      add: 'Thêm Mới Thẻ Admin',
      grant: `Cấp Quyền Thẻ ${dialog.uid}`,
      rename: `Đổi Tên Chủ Thẻ ${dialog.uid}`,
    })[dialog.mode],
);
const submitLabel = computed(() => ({ add: 'Lưu thẻ', grant: 'Cấp quyền', rename: 'Lưu thay đổi' })[dialog.mode]);

function openDialog(mode, row = {}) {
  Object.assign(dialog, { visible: true, mode, id: row.id ?? null, uid: row.uid ?? '', name: row.name ?? '', error: '' });
}

async function submitDialog() {
  dialog.error = '';
  dialog.saving = true;
  try {
    if (dialog.mode === 'rename') {
      await api(`/dash-api/cards/${dialog.id}`, { method: 'PATCH', body: { name: dialog.name } });
      toast.add({ severity: 'success', summary: 'Đã lưu thay đổi', detail: `Đã đổi tên chủ thẻ ${dialog.uid} thành "${dialog.name.trim()}".`, life: 4000 });
    } else {
      const card = await api('/dash-api/cards', {
        method: 'POST',
        body: { deviceId: deviceId.value, uid: dialog.uid, name: dialog.name },
      });
      toast.add({
        severity: 'success',
        summary: 'Đã cấp quyền thẻ Admin',
        detail: `Thẻ ${card.uid} (${card.name}) sẽ dùng được tại ${device.value?.name} trong vòng 30 giây.`,
        life: 6000,
      });
    }
    dialog.visible = false;
    loadCards();
  } catch (err) {
    dialog.error = err.message;
  } finally {
    dialog.saving = false;
  }
}

function confirmDelete(card) {
  confirm.require({
    header: 'Xác Nhận Xóa Thẻ Admin',
    message: `Xóa thẻ ${card.uid} của "${card.name}"? Sau khi két đồng bộ (tối đa 30 giây), thẻ này không còn mở được két.`,
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Xóa thẻ', severity: 'danger' },
    rejectProps: { label: 'Hủy bỏ', severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await api(`/dash-api/cards/${card.id}`, { method: 'DELETE' });
        toast.add({ severity: 'success', summary: 'Đã xóa thẻ', detail: `Đã thu hồi quyền của thẻ ${card.uid} (${card.name}).`, life: 4000 });
        loadCards();
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
      <p class="m-0 text-xs text-slate-500">Két tự tải danh sách thẻ mới mỗi 30 giây, mỗi két lưu tối đa {{ MAX_CARDS }} thẻ.</p>
    </div>

    <Message v-if="store.devicesLoaded && !store.devices.length" severity="info">
      Chưa có két nào trong hệ thống. Tạo két bằng lệnh <code>npm run device:create -- "Ket sat 01"</code> trước khi thêm thẻ.
    </Message>

    <div v-else class="grid gap-4 lg:grid-cols-3">
      <Card class="border border-slate-200 lg:col-span-2">
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
                {{ cards.length }}/{{ MAX_CARDS }} thẻ<template v-if="device"> · Phiên bản danh sách v{{ device.cardsVersion }}</template>
              </span>
              <Button
                label="Thêm thẻ mới"
                icon="pi pi-plus"
                size="small"
                class="ml-auto"
                :disabled="!deviceId || cards.length >= MAX_CARDS"
                @click="openDialog('add')"
              />
            </div>

            <DataTable :value="cards" :loading="loading" data-key="id" size="small">
              <template #empty>
                <div class="py-6 text-center text-sm text-slate-500">
                  Két này chưa có thẻ Admin nào. Quẹt thẻ vào két rồi bấm "Cấp quyền" ở mục Thẻ lạ, hoặc nhấn "Thêm thẻ mới".
                </div>
              </template>
              <Column field="name" header="Chủ thẻ">
                <template #body="{ data }">
                  <span class="font-medium text-slate-900">{{ data.name }}</span>
                </template>
              </Column>
              <Column field="uid" header="UID thẻ">
                <template #body="{ data }">
                  <span class="font-mono text-sm">{{ data.uid }}</span>
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
                    <Button label="Đổi tên" icon="pi pi-pencil" size="small" severity="secondary" text @click="openDialog('rename', data)" />
                    <Button label="Xóa" icon="pi pi-trash" size="small" severity="danger" text @click="confirmDelete(data)" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </Card>

      <Card class="border border-slate-200">
        <template #content>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <h4 class="m-0 text-base font-semibold text-slate-900">Thẻ lạ quẹt gần đây</h4>
              <p class="m-0 text-xs text-slate-500">Quẹt thẻ mới vào két, thẻ sẽ hiện ở đây trong vài giây.</p>
            </div>
            <DataTable :value="unknown" data-key="uid" size="small">
              <template #empty>
                <div class="py-6 text-center text-sm text-slate-500">Không có thẻ lạ nào trong 7 ngày qua.</div>
              </template>
              <Column header="UID thẻ">
                <template #body="{ data }">
                  <div class="flex flex-col gap-1">
                    <span class="font-mono text-sm">{{ data.uid }}</span>
                    <span class="text-xs text-slate-500">{{ data.count }} lần · {{ timeAgo(data.lastSeenAt, store.now) }}</span>
                  </div>
                </template>
              </Column>
              <Column header="" class="w-0">
                <template #body="{ data }">
                  <Button
                    label="Cấp quyền"
                    icon="pi pi-check"
                    size="small"
                    outlined
                    :disabled="cards.length >= MAX_CARDS"
                    @click="openDialog('grant', data)"
                  />
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </Card>
    </div>

    <Dialog v-model:visible="dialog.visible" :header="dialogTitle" modal :draggable="false" class="w-full max-w-md">
      <form id="card-form" class="flex flex-col gap-4" @submit.prevent="submitDialog">
        <Message v-if="dialog.error" severity="error" size="small">{{ dialog.error }}</Message>
        <div class="flex flex-col gap-2">
          <label for="card-uid" class="text-sm font-medium text-slate-700">UID thẻ</label>
          <InputText
            id="card-uid"
            v-model="dialog.uid"
            placeholder="Ví dụ: DE AD BE EF"
            :disabled="dialog.mode !== 'add'"
            class="font-mono"
            fluid
          />
          <small v-if="dialog.mode === 'add'" class="text-xs text-slate-500">
            Xem dòng "[RFID] UID: ..." trên Serial Monitor khi quẹt thẻ.
          </small>
        </div>
        <div class="flex flex-col gap-2">
          <label for="card-name" class="text-sm font-medium text-slate-700">Tên chủ thẻ</label>
          <InputText id="card-name" v-model="dialog.name" placeholder="Ví dụ: Nguyễn Văn A" maxlength="60" autofocus fluid />
        </div>
      </form>
      <template #footer>
        <Button label="Hủy bỏ" severity="secondary" outlined @click="dialog.visible = false" />
        <Button type="submit" form="card-form" :label="submitLabel" icon="pi pi-check" :loading="dialog.saving" />
      </template>
    </Dialog>
  </div>
</template>
