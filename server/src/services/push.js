import webpush from 'web-push';
import { config } from '../config.js';
import { prisma } from '../prisma.js';

const { publicKey, privateKey, subject, severities } = config.push;
export const pushEnabled = Boolean(publicKey && privateKey);
if (pushEnabled) webpush.setVapidDetails(subject, publicKey, privateKey);

export const pushPublicKey = publicKey;

const TITLES = { critical: 'Báo động', warning: 'Cảnh báo', info: 'Thông báo' };

export function toPushPayload(ev) {
  const detail = [ev.message, ev.meta?.uid && `UID thẻ: ${ev.meta.uid}`].filter(Boolean).join(' · ');
  return {
    title: `${TITLES[ev.severity] ?? 'Thông báo'} · ${ev.deviceName}`,
    body: detail,
    // Báo động cùng một két chỉ giữ một thông báo trên màn hình, các loại khác tách riêng.
    tag: ev.severity === 'critical' ? `alarm-${ev.deviceId}` : `event-${ev.id}`,
    severity: ev.severity,
    url: '/',
  };
}

// Gọi sau khi đã trả lời ESP32; lỗi gửi push không ảnh hưởng việc lưu sự kiện.
export async function notifyPush(events) {
  const list = events.filter((ev) => severities.includes(ev.severity));
  if (!pushEnabled || !list.length) return;

  const subs = await prisma.pushSubscription.findMany();
  if (!subs.length) return;

  const gone = new Set();
  await Promise.allSettled(
    subs.flatMap((sub) =>
      list.map(async (ev) => {
        const payload = JSON.stringify(toPushPayload(ev));
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 3600, urgency: ev.severity === 'critical' ? 'high' : 'normal' },
          );
        } catch (err) {
          // 404/410: người dùng đã hủy hoặc gỡ app, bỏ đăng ký này.
          if (err.statusCode === 404 || err.statusCode === 410) gone.add(sub.endpoint);
          else console.warn(`[PUSH] Không gửi được (HTTP ${err.statusCode ?? '?'}): ${err.message}`);
        }
      }),
    ),
  );

  if (gone.size) await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: [...gone] } } });
}
