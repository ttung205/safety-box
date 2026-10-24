import { computed, reactive } from 'vue';
import { api } from './api.js';
import { socket } from './socket.js';

// Trạng thái dùng chung: danh sách két + sự kiện báo động gần nhất của từng két.
export const store = reactive({
  devices: [],
  devicesLoaded: false,
  lastAlarm: {}, // deviceId -> sự kiện ALARM gần nhất
  now: Date.now(),
});

const offlineAfterMs = (Number(import.meta.env.VITE_OFFLINE_AFTER_SEC) || 60) * 1000;

function withPresence(device, now = Date.now()) {
  return { ...device, online: Boolean(device.lastSeenAt) && now - new Date(device.lastSeenAt).getTime() < offlineAfterMs };
}

setInterval(() => {
  store.now = Date.now();
  store.devices = store.devices.map((device) => withPresence(device, store.now));
}, 10000);

export const alarmingDevices = computed(() => store.devices.filter((d) => d.state === 'ALARM'));

async function fetchLastAlarm(deviceId) {
  const res = await api('/dash-api/events', { query: { type: 'ALARM', deviceId, pageSize: 1 } }).catch(() => null);
  if (res?.items[0]) store.lastAlarm[deviceId] = res.items[0];
}

function upsertDevice(device) {
  device = withPresence(device);
  const i = store.devices.findIndex((d) => d.id === device.id);
  if (i >= 0) store.devices[i] = device;
  else store.devices.push(device);
  if (device.state === 'ALARM' && !store.lastAlarm[device.id]) fetchLastAlarm(device.id);
}

export async function loadDevices() {
  const devices = await api('/dash-api/devices');
  store.devices = [];
  devices.forEach(upsertDevice);
  store.devicesLoaded = true;
}

socket.on('device:updated', upsertDevice);
socket.on('event:created', (e) => {
  if (e.type === 'ALARM') store.lastAlarm[e.deviceId] = e;
});
socket.on('connect', () => loadDevices().catch(() => {}));
