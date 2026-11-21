import { prisma } from '../prisma.js';

// "de:ad:be:ef", "DEADBEEF", "de ad be ef" -> "DE AD BE EF" (đúng định dạng firmware in ra).
export function normalizeUid(input) {
  const hex = String(input ?? '').replace(/[^0-9a-f]/gi, '').toUpperCase();
  if (hex.length < 8 || hex.length > 20 || hex.length % 2) return null;
  return hex.match(/../g).join(' ');
}

// Gắn tên chủ thẻ (cardName) vào các sự kiện có meta.uid để nhật ký hiện "Tung (7A 42 D0 8C)" thay vì chỉ UID.
// Tra theo tên hiện tại của thẻ, nên đổi tên thẻ thì nhật ký cũ cũng đổi theo. UID chưa đăng ký thì không có tên.
export async function attachCardNames(events) {
  const wanted = events.map((e) => [e.deviceId, normalizeUid(e.meta?.uid)]).filter(([, uid]) => uid);
  if (!wanted.length) return events;
  const cards = await prisma.card.findMany({
    where: {
      deviceId: { in: [...new Set(wanted.map(([d]) => d))] },
      uid: { in: [...new Set(wanted.map(([, u]) => u))] },
    },
    select: { deviceId: true, uid: true, name: true },
  });
  const names = new Map(cards.map((c) => [`${c.deviceId}|${c.uid}`, c.name]));
  for (const e of events) {
    const uid = normalizeUid(e.meta?.uid);
    const name = uid && names.get(`${e.deviceId}|${uid}`);
    if (name) e.cardName = name;
  }
  return events;
}
