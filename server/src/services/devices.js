import crypto from 'node:crypto';
import { config } from '../config.js';
import { emitDashboard } from '../realtime.js';

export const hashKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');
export const newDeviceKey = () => crypto.randomBytes(24).toString('base64url');

export function isOnline(device, now = Date.now()) {
  return Boolean(device.lastSeenAt) && now - device.lastSeenAt.getTime() < config.offlineAfterMs;
}

export function toDeviceDto(d) {
  return {
    id: d.id,
    name: d.name,
    state: d.state,
    ip: d.ip,
    rssi: d.rssi,
    fw: d.fw,
    timeOk: d.timeOk,
    uptime: d.uptime,
    freeHeap: d.freeHeap,
    lastSeenAt: d.lastSeenAt,
    cardsVersion: d.cardsVersion,
    online: isOnline(d),
  };
}

export async function emitDevice(device) {
  const dto = toDeviceDto(device);
  await emitDashboard('device:updated', dto);
}
