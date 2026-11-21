import { prisma } from '../prisma.js';
import { emitDashboard } from '../realtime.js';
import { toEventDto } from './ingest.js';
import { SEVERITY_BY_TYPE } from './labels.js';
import { notifyPush } from './push.js';
import { notifyEvents } from './telegram.js';

// Két im lặng quá ngần này giây thì coi là mất kết nối (mất điện, hết pin, rớt WiFi...).
// Cron chạy mỗi 5 phút nên thực tế báo trong khoảng 2 đến 7 phút sau khi két mất liên lạc.
export const OFFLINE_ALERT_MS = (Number(process.env.OFFLINE_ALERT_SEC) || 120) * 1000;

// Sự kiện do máy chủ tự tạo (két không gửi được vì chính nó đang mất kết nối).
// uid cố định theo thời điểm nên gọi lại nhiều lần cũng không tạo trùng.
async function createServerEvent(device, { uid, type, message, meta, occurredAt = new Date() }) {
  const rows = await prisma.safeEvent.createManyAndReturn({
    data: [{
      deviceId: device.id,
      uid,
      type,
      severity: SEVERITY_BY_TYPE[type],
      state: device.state ?? null,
      message,
      meta,
      occurredAt,
    }],
    skipDuplicates: true,
    include: { device: { select: { name: true } } },
  });
  const created = rows.map(toEventDto);
  await Promise.all(created.map((ev) => emitDashboard('event:created', ev)));
  await Promise.allSettled([notifyEvents(created), notifyPush(created)]);
  return created.length;
}

// Cron gọi định kỳ: két nào im quá lâu mà chưa có cảnh báo cho lần mất kết nối này thì tạo một cảnh báo.
export async function checkOffline(now = new Date()) {
  const devices = await prisma.device.findMany({
    where: { lastSeenAt: { lt: new Date(now.getTime() - OFFLINE_ALERT_MS) } },
  });
  let alerted = 0;
  for (const d of devices) {
    const minutes = Math.round((now.getTime() - d.lastSeenAt.getTime()) / 60000);
    const onBattery = d.onBattery === true;
    alerted += await createServerEvent(d, {
      // Gắn với lần cuối két liên lạc: cùng một đợt mất kết nối chỉ báo một lần.
      uid: `srv-offline-${d.id}-${d.lastSeenAt.getTime()}`,
      type: 'DEVICE_OFFLINE',
      message: onBattery
        ? 'Két mất kết nối khi đang chạy pin, có thể đã hết pin'
        : 'Két mất kết nối, kiểm tra nguồn điện và WiFi',
      meta: { last_seen: d.lastSeenAt.toISOString(), minutes, on_battery: d.onBattery, batt_pct: d.battPct },
      occurredAt: now,
    });
  }
  return { checked: devices.length, alerted };
}

// Gọi khi két liên lạc lại: nếu vừa im lặng quá ngưỡng thì ghi nhận là đã kết nối lại.
export async function noteReconnect(device, now = new Date()) {
  if (!device.lastSeenAt) return;
  const gap = now.getTime() - device.lastSeenAt.getTime();
  if (gap <= OFFLINE_ALERT_MS) return;
  await createServerEvent(device, {
    // Gắn với lần liên lạc cuối trước đó: hai yêu cầu đến cùng lúc cũng chỉ ghi một sự kiện.
    uid: `srv-online-${device.id}-${device.lastSeenAt.getTime()}`,
    type: 'DEVICE_ONLINE',
    message: 'Két kết nối lại',
    meta: { offline_sec: Math.round(gap / 1000) },
    occurredAt: now,
  }).catch((err) => console.warn(`[PRESENCE] Không ghi được sự kiện kết nối lại: ${err.message}`));
}
