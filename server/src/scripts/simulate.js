// Giả lập ESP32 để demo dashboard khi chưa cắm két thật (server phải đang chạy).
//   npm run simulate                     chạy kịch bản demo trên "Két mô phỏng"
//   npm run simulate -- --backfill 14    sinh thêm dữ liệu 14 ngày qua cho biểu đồ
//   npm run simulate -- --key <KEY>      dùng khóa của một két có sẵn
//   npm run simulate -- --url http://192.168.1.10:3000/api/device
import { parseArgs } from 'node:util';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { hashKey, newDeviceKey } from '../services/devices.js';

const { values: opts } = parseArgs({
  options: {
    key: { type: 'string' },
    url: { type: 'string', default: `http://localhost:${config.port}/api/device` },
    backfill: { type: 'string' },
    fast: { type: 'boolean', default: false },
  },
});

const SIM_NAME = 'Két mô phỏng';
const UID_ADMIN = 'DE AD BE EF';
const UID_STRANGER = '04 A1 B2 C3';
const bootId = Math.floor(Math.random() * 2 ** 32);
let seq = 0;

async function getKey() {
  if (opts.key) return opts.key;
  // Khóa chỉ lưu dạng hash nên mỗi lần chạy cấp khóa mới cho két mô phỏng.
  const key = newDeviceKey();
  const existing = await prisma.device.findFirst({ where: { name: SIM_NAME } });
  if (existing) {
    await prisma.device.update({ where: { id: existing.id }, data: { apiKeyHash: hashKey(key) } });
  } else {
    const d = await prisma.device.create({ data: { name: SIM_NAME, apiKeyHash: hashKey(key) } });
    await prisma.card.create({ data: { deviceId: d.id, uid: UID_ADMIN, name: 'Thẻ Admin mẫu' } });
  }
  return key;
}

const key = await getKey();
await prisma.$disconnect();

async function post(path, body) {
  const res = await fetch(opts.url + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Key': key },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

const ev = (type, state, message, meta, ts = Math.floor(Date.now() / 1000)) => ({
  seq: ++seq, ts, type, state, message, ...(meta && { meta }),
});
const heartbeat = (state) =>
  post('/heartbeat', { state, rssi: -55 - Math.floor(Math.random() * 15), ip: '192.168.1.50', uptime: Math.floor(process.uptime()), time_ok: true, fw: '1.1.0-sim', free_heap: 182000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, opts.fast ? 50 : ms));

async function backfill(days) {
  const now = Math.floor(Date.now() / 1000);
  const events = [];
  for (let d = days; d >= 1; d--) {
    const dayStart = now - d * 86400;
    const at = (h) => dayStart + h * 3600 + Math.floor(Math.random() * 3000);
    for (let i = 0, n = 1 + Math.floor(Math.random() * 3); i < n; i++) {
      const h = 8 + i * 4;
      if (Math.random() < 0.7) events.push(ev('OPENED', 'OPEN', 'Mở két bằng thẻ', { by: 'card', uid: UID_ADMIN }, at(h)));
      else events.push(ev('OPENED', 'OPEN', 'Mở két bằng OTP', { by: 'otp' }, at(h)));
      events.push(ev('LOCKED', 'LOCKED', 'Đóng két', { by: 'keypad' }, at(h) + 90));
    }
    if (Math.random() < 0.5) events.push(ev('CARD_UNKNOWN', 'LOCKED', 'Quẹt thẻ lạ', { uid: UID_STRANGER }, at(19)));
    if (Math.random() < 0.4) events.push(ev('OTP_WRONG', 'WAIT_OTP', 'Nhập sai OTP', { attempt: 1, max: 3, time_ok: true }, at(20)));
    if (Math.random() < 0.6) events.push(ev('VIBRATION', 'LOCKED', 'Rung nhẹ dưới ngưỡng – bỏ qua', { hits: 1, vibration_ms: 40 }, at(21)));
    if (Math.random() < 0.2) {
      events.push(ev('ALARM', 'ALARM', 'BÁO ĐỘNG: phát hiện cạy phá', { reason: 'TAMPER', hits: 6, vibration_ms: 420 }, at(23)));
      events.push(ev('ALARM_RESET', 'LOCKED', 'Admin tắt báo động', { uid: UID_ADMIN }, at(23) + 300));
    }
  }
  for (let i = 0; i < events.length; i += 50) await post('/events', { boot_id: bootId, events: events.slice(i, i + 50) });
  console.log(`Đã sinh ${events.length} sự kiện cho ${days} ngày qua.`);
}

// Kịch bản demo theo docs: rung nhẹ -> thẻ lạ -> mở két -> khóa -> cạy phá -> tắt báo động.
const steps = [
  ['LOCKED', ev('BOOT', 'LOCKED', 'Khởi động hệ thống', { fw: '1.1.0-sim', rtc: true, time_ok: true })],
  ['LOCKED', ev('VIBRATION', 'LOCKED', 'Rung nhẹ dưới ngưỡng – bỏ qua', { hits: 1, vibration_ms: 35 })],
  ['LOCKED', ev('CARD_UNKNOWN', 'LOCKED', 'Quẹt thẻ lạ', { uid: UID_STRANGER })],
  ['WAIT_OTP', ev('CARD_ADMIN', 'WAIT_OTP', 'Quẹt thẻ Admin hợp lệ', { uid: UID_ADMIN })],
  ['WAIT_OTP', ev('OTP_WRONG', 'WAIT_OTP', 'Nhập sai OTP', { attempt: 1, max: 3, time_ok: true })],
  ['OPEN', ev('OPENED', 'OPEN', 'Mở két (thẻ + OTP)')],
  ['LOCKED', ev('LOCKED', 'LOCKED', 'Khóa két', { by: 'keypad' })],
  ['ALARM', ev('ALARM', 'ALARM', 'BÁO ĐỘNG: phát hiện cạy phá', { reason: 'TAMPER', hits: 6, vibration_ms: 420 })],
  ['LOCKED', ev('ALARM_RESET', 'LOCKED', 'Admin tắt báo động', { uid: UID_ADMIN })],
];

try {
  await heartbeat('LOCKED');
  if (opts.backfill) await backfill(Math.min(60, Number(opts.backfill) || 14));
  for (const [state, e] of steps) {
    e.ts = Math.floor(Date.now() / 1000);
    await post('/events', { boot_id: bootId, events: [e] });
    await heartbeat(state);
    console.log(`→ ${e.type}: ${e.message}`);
    await sleep(e.type === 'ALARM' ? 10000 : 3000);
  }
  console.log('Xong kịch bản demo.');
} catch (err) {
  console.error(`Lỗi: ${err.message}\n(Server đã chạy chưa? npm run dev)`);
  process.exitCode = 1;
}
