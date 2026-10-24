import { prisma } from '../prisma.js';
import { emitDashboard } from '../socket.js';
import { emitDevice } from './devices.js';
import { SEVERITY_BY_TYPE } from './labels.js';

const DAY_MS = 86400000;
const MIN_VALID_TS = 1700000000; // giống timeIsValid() trong firmware

// ts = 0 (két chưa có giờ) hoặc lệch quá xa thì dùng giờ server nhận.
export function resolveOccurredAt(ts, now) {
  if (!ts || ts < MIN_VALID_TS || ts * 1000 > now.getTime() + DAY_MS) return now;
  return new Date(ts * 1000);
}

export function toEventDto(e) {
  return {
    id: e.id,
    deviceId: e.deviceId,
    deviceName: e.device?.name,
    type: e.type,
    severity: e.severity,
    state: e.state,
    message: e.message,
    meta: e.meta,
    occurredAt: e.occurredAt,
    receivedAt: e.receivedAt,
  };
}

export async function ingestEvents(device, { boot_id, events }) {
  const now = new Date();
  const created = [];
  let duplicates = 0;

  for (const e of events) {
    try {
      const row = await prisma.safeEvent.create({
        data: {
          deviceId: device.id,
          uid: `${boot_id}-${e.seq}`,
          type: e.type,
          severity: SEVERITY_BY_TYPE[e.type],
          state: e.state ?? null,
          message: e.message,
          meta: e.meta ?? undefined,
          occurredAt: resolveOccurredAt(e.ts, now),
          receivedAt: now,
        },
        include: { device: { select: { name: true } } },
      });
      created.push(toEventDto(row));
    } catch (err) {
      if (err.code === 'P2002') {
        duplicates++; // bản gửi lại của lô cũ
        continue;
      }
      throw err;
    }
  }

  const lastState = events.findLast((e) => e.state)?.state;
  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { lastSeenAt: now, ...(lastState && { state: lastState }) },
  });

  for (const ev of created) emitDashboard('event:created', ev);
  emitDevice(updated);
  return { accepted: created.length, duplicates, created };
}

export async function recordHeartbeat(device, hb) {
  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      state: hb.state,
      ip: hb.ip,
      rssi: hb.rssi,
      fw: hb.fw,
      uptime: hb.uptime,
      timeOk: hb.time_ok,
      freeHeap: hb.free_heap,
    },
  });
  emitDevice(updated);
  return updated;
}
