import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { emitDashboard } from '../socket.js';
import { toDeviceDto } from '../services/devices.js';
import { toEventDto } from '../services/ingest.js';
import { EVENT_TYPES, SEVERITIES } from '../services/labels.js';

// API chỉ đọc cho dashboard (+ quản lý thẻ). Không có route nào gửi lệnh về két.
export const dashRouter = Router();

const DAY_MS = 86400000;
const VN_OFFSET_MS = 7 * 3600000;
const withDevice = { device: { select: { name: true } } };

const int = (v, min, max, def) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const date = (v) => {
  if (!v) return undefined;
  const d = new Date(/^\d+$/.test(v) ? Number(v) : v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

// ------------------------------------------------------------------- Két
dashRouter.get('/devices', async (req, res) => {
  const devices = await prisma.device.findMany({ orderBy: { id: 'asc' } });
  res.json(devices.map(toDeviceDto));
});

// --------------------------------------------------------------- Sự kiện
function eventWhere(q) {
  const types = String(q.type || '').split(',').filter((t) => EVENT_TYPES.includes(t));
  const from = date(q.from);
  const to = date(q.to);
  return {
    ...(types.length && { type: { in: types } }),
    ...(SEVERITIES.includes(q.severity) && { severity: q.severity }),
    ...(q.deviceId && { deviceId: int(q.deviceId, 1, 2 ** 31, 0) }),
    ...((from || to) && { occurredAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
  };
}

dashRouter.get('/events', async (req, res) => {
  const where = eventWhere(req.query);
  const page = int(req.query.page, 1, 100000, 1);
  const pageSize = int(req.query.pageSize, 1, 100, 20);
  const [total, rows] = await Promise.all([
    prisma.safeEvent.count({ where }),
    prisma.safeEvent.findMany({
      where,
      include: withDevice,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  res.json({ items: rows.map(toEventDto), total, page, pageSize });
});

dashRouter.get('/events/export', async (req, res) => {
  const rows = await prisma.safeEvent.findMany({
    where: eventWhere(req.query),
    include: withDevice,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: 20000,
  });
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const vnTime = (d) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 19);
  const lines = [['Thời gian', 'Két', 'Mức độ', 'Loại', 'Trạng thái', 'Nội dung', 'Chi tiết'].map(cell).join(',')];
  for (const r of rows) {
    const meta = r.meta ? JSON.stringify(r.meta) : '';
    lines.push([vnTime(r.occurredAt), r.device.name, r.severity, r.type, r.state, r.message, meta].map(cell).join(','));
  }
  const today = vnTime(new Date()).slice(0, 10);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="nhat-ky-ket-sat-${today}.csv"`);
  res.send('﻿' + lines.join('\r\n')); // BOM để Excel hiển thị đúng tiếng Việt
});

// -------------------------------------------------------------- Thống kê
// Số sự kiện theo ngày (giờ Việt Nam) và mức độ.
dashRouter.get('/stats', async (req, res) => {
  const days = int(req.query.days, 1, 60, 14);
  const today = Math.floor((Date.now() + VN_OFFSET_MS) / DAY_MS);
  const firstDay = today - days + 1;
  const rows = await prisma.safeEvent.findMany({
    where: { occurredAt: { gte: new Date(firstDay * DAY_MS - VN_OFFSET_MS) } },
    select: { severity: true, occurredAt: true },
  });

  const series = Array.from({ length: days }, (_, i) => ({
    date: new Date((firstDay + i) * DAY_MS).toISOString().slice(0, 10),
    critical: 0,
    warning: 0,
    info: 0,
  }));
  for (const r of rows) {
    const slot = series[Math.floor((r.occurredAt.getTime() + VN_OFFSET_MS) / DAY_MS) - firstDay];
    if (slot && slot[r.severity] !== undefined) slot[r.severity]++;
  }

  const lastAlarm = await prisma.safeEvent.findFirst({
    where: { type: 'ALARM' },
    include: withDevice,
    orderBy: { occurredAt: 'desc' },
  });
  res.json({ days: series, today: series.at(-1), lastAlarm: lastAlarm && toEventDto(lastAlarm) });
});

// ------------------------------------------------------------- Thẻ Admin
// "de:ad:be:ef", "DEADBEEF", "de ad be ef" -> "DE AD BE EF" (đúng định dạng firmware in ra).
export function normalizeUid(input) {
  const hex = String(input ?? '').replace(/[^0-9a-f]/gi, '').toUpperCase();
  if (hex.length < 8 || hex.length > 20 || hex.length % 2) return null;
  return hex.match(/../g).join(' ');
}

const cardSchema = z.object({
  deviceId: z.number().int().positive(),
  uid: z.string(),
  name: z.string().trim().min(1, 'Vui lòng nhập tên chủ thẻ.').max(60),
});
const renameSchema = z.object({ name: z.string().trim().min(1, 'Vui lòng nhập tên chủ thẻ.').max(60) });

const toCardDto = (c) => ({ id: c.id, deviceId: c.deviceId, uid: c.uid, name: c.name, createdAt: c.createdAt });

function cardsChanged(device) {
  emitDashboard('cards:updated', { deviceId: device.id, cardsVersion: device.cardsVersion });
}

dashRouter.get('/cards', async (req, res) => {
  const where = req.query.deviceId ? { deviceId: int(req.query.deviceId, 1, 2 ** 31, 0) } : {};
  const cards = await prisma.card.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(cards.map(toCardDto));
});

// UID lạ quẹt gần đây (sự kiện CARD_UNKNOWN 7 ngày qua), chưa có trong danh sách thẻ.
dashRouter.get('/cards/unknown', async (req, res) => {
  const deviceId = int(req.query.deviceId, 1, 2 ** 31, 0);
  const where = { type: 'CARD_UNKNOWN', occurredAt: { gte: new Date(Date.now() - 7 * DAY_MS) } };
  if (deviceId) where.deviceId = deviceId;
  const [events, cards] = await Promise.all([
    prisma.safeEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, take: 500 }),
    prisma.card.findMany({ where: deviceId ? { deviceId } : {} }),
  ]);
  const known = new Set(cards.map((c) => `${c.deviceId}|${c.uid}`));
  const groups = new Map();
  for (const e of events) {
    const uid = normalizeUid(e.meta?.uid);
    if (!uid || known.has(`${e.deviceId}|${uid}`)) continue;
    const key = `${e.deviceId}|${uid}`;
    const g = groups.get(key) ?? { deviceId: e.deviceId, uid, count: 0, lastSeenAt: e.occurredAt };
    g.count++;
    groups.set(key, g);
  }
  res.json([...groups.values()].slice(0, 20));
});

dashRouter.post('/cards', async (req, res) => {
  const r = cardSchema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });
  const uid = normalizeUid(r.data.uid);
  if (!uid) return res.status(400).json({ error: 'UID không hợp lệ. Nhập 4–10 byte dạng hex, ví dụ: DE AD BE EF.' });

  const device = await prisma.device.findUnique({ where: { id: r.data.deviceId } });
  if (!device) return res.status(404).json({ error: 'Không tìm thấy két được chọn.' });
  const count = await prisma.card.count({ where: { deviceId: device.id } });
  if (count >= config.maxCards) {
    return res.status(400).json({ error: `Két chỉ lưu được tối đa ${config.maxCards} thẻ. Vui lòng xóa bớt thẻ cũ.` });
  }
  if (await prisma.card.findUnique({ where: { deviceId_uid: { deviceId: device.id, uid } } })) {
    return res.status(409).json({ error: `Thẻ ${uid} đã có trong danh sách của két này.` });
  }

  const [card, updated] = await prisma.$transaction([
    prisma.card.create({ data: { deviceId: device.id, uid, name: r.data.name } }),
    prisma.device.update({ where: { id: device.id }, data: { cardsVersion: { increment: 1 } } }),
  ]);
  cardsChanged(updated);
  res.status(201).json(toCardDto(card));
});

// Đổi tên chủ thẻ (không đổi danh sách UID nên không tăng version).
dashRouter.patch('/cards/:id', async (req, res) => {
  const r = renameSchema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });
  const card = await prisma.card.findUnique({ where: { id: int(req.params.id, 1, 2 ** 31, 0) } });
  if (!card) return res.status(404).json({ error: 'Không tìm thấy thẻ.' });
  const updated = await prisma.card.update({ where: { id: card.id }, data: { name: r.data.name } });
  emitDashboard('cards:updated', { deviceId: card.deviceId });
  res.json(toCardDto(updated));
});

dashRouter.delete('/cards/:id', async (req, res) => {
  const card = await prisma.card.findUnique({ where: { id: int(req.params.id, 1, 2 ** 31, 0) } });
  if (!card) return res.status(404).json({ error: 'Không tìm thấy thẻ.' });
  const [, updated] = await prisma.$transaction([
    prisma.card.delete({ where: { id: card.id } }),
    prisma.device.update({ where: { id: card.deviceId }, data: { cardsVersion: { increment: 1 } } }),
  ]);
  cardsChanged(updated);
  res.json({ ok: true });
});
