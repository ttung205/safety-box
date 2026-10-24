import { waitUntil } from '@vercel/functions';
import { Router } from 'express';
import { z } from 'zod';
import { deviceAuth } from '../middleware/deviceAuth.js';
import { prisma } from '../prisma.js';
import { ingestEvents, recordHeartbeat } from '../services/ingest.js';
import { EVENT_TYPES, STATES } from '../services/labels.js';
import { notifyPush } from '../services/push.js';
import { notifyEvents } from '../services/telegram.js';

// API cho ESP32: API_BASE = http://<server>:3000/api/device, header X-Device-Key.
export const deviceRouter = Router();

deviceRouter.use(deviceAuth);

const eventsSchema = z.object({
  boot_id: z.number().int().nonnegative(),
  events: z
    .array(
      z.object({
        seq: z.number().int().nonnegative(),
        ts: z.number().int().nonnegative(),
        type: z.enum(EVENT_TYPES),
        state: z.enum(STATES).nullish(),
        message: z.string().max(255),
        meta: z.record(z.string(), z.unknown()).nullish(),
      }),
    )
    .min(1)
    .max(50),
});

const heartbeatSchema = z.object({
  state: z.enum(STATES).optional(),
  rssi: z.number().int().optional(),
  ip: z.string().max(45).optional(),
  uptime: z.number().int().nonnegative().optional(),
  time_ok: z.boolean().optional(),
  fw: z.string().max(32).optional(),
  free_heap: z.number().int().nonnegative().optional(),
});

// 422 = dữ liệu sai -> firmware bỏ lô đó, không gửi lại mãi.
function parse(schema, req, res) {
  const r = schema.safeParse(req.body);
  if (!r.success) res.status(422).json({ error: 'Dữ liệu không hợp lệ', issues: r.error.issues });
  return r.success ? r.data : null;
}

deviceRouter.post('/events', async (req, res) => {
  const body = parse(eventsSchema, req, res);
  if (!body) return;
  const { accepted, duplicates, created } = await ingestEvents(req.device, body);
  res.json({ ok: true, accepted, duplicates });
  const notification = Promise.allSettled([notifyEvents(created), notifyPush(created)]);
  try {
    waitUntil(notification);
  } catch {
    // Khi chạy Express local không có request context của Vercel; promise vẫn tiếp tục chạy.
  }
});

deviceRouter.post('/heartbeat', async (req, res) => {
  const body = parse(heartbeatSchema, req, res);
  if (!body) return;
  await recordHeartbeat(req.device, body);
  res.json({ ok: true, server_time: Math.floor(Date.now() / 1000) });
});

// ESP32 gọi mỗi 30 giây, chỉ cập nhật khi version đổi.
deviceRouter.get('/cards', async (req, res) => {
  const cards = await prisma.card.findMany({ where: { deviceId: req.device.id }, orderBy: { id: 'asc' } });
  res.json({ version: req.device.cardsVersion, cards: cards.map((c) => c.uid) });
});
