import crypto from 'node:crypto';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { emitDashboard } from '../socket.js';

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

const lastOnline = new Map(); // deviceId -> trạng thái online đã phát gần nhất

export function emitDevice(device) {
  const dto = toDeviceDto(device);
  lastOnline.set(device.id, dto.online);
  emitDashboard('device:updated', dto);
}

// Không có heartbeat quá OFFLINE_AFTER_SEC thì báo dashboard là két mất kết nối.
export function startPresenceWatcher() {
  return setInterval(async () => {
    try {
      for (const d of await prisma.device.findMany()) {
        const online = isOnline(d);
        if (lastOnline.has(d.id) && lastOnline.get(d.id) !== online) emitDevice(d);
        else lastOnline.set(d.id, online);
      }
    } catch (err) {
      console.error('[PRESENCE]', err.message);
    }
  }, 10000).unref();
}
