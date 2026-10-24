import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/supabase.js', () => ({
  supabase: {
    auth: {
      getClaims: vi.fn(async (token) =>
        token === 'test-token'
          ? { data: { claims: { sub: 'test-user', email: 'admin@test.local' } }, error: null }
          : { data: null, error: new Error('invalid token') },
      ),
    },
  },
}));
vi.mock('../src/realtime.js', () => ({ emitDashboard: vi.fn(async () => {}) }));

import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { hashKey } from '../src/services/devices.js';

const app = createApp();
const KEY = 'khoa-test-123';
let device;

const ev = (seq, type = 'OPENED', extra = {}) => ({
  seq, ts: Math.floor(Date.now() / 1000), type, state: 'OPEN', message: 'Mở két', ...extra,
});

function dashboard(method, path) {
  return request(app)[method](path).set('Authorization', 'Bearer test-token');
}

beforeAll(async () => {
  device = await prisma.device.create({ data: { name: 'Két test', apiKeyHash: hashKey(KEY) } });
});
afterAll(() => prisma.$disconnect());

describe('API cho ESP32', () => {
  it('sai khóa thiết bị bị 401', async () => {
    await request(app).post('/api/device/heartbeat').set('X-Device-Key', 'sai').send({}).expect(401);
    await request(app).get('/api/device/cards').expect(401);
  });

  it('gửi lại cùng lô không bị ghi trùng', async () => {
    const body = { boot_id: 42, events: [ev(1), ev(2, 'LOCKED', { state: 'LOCKED' })] };
    const first = await request(app).post('/api/device/events').set('X-Device-Key', KEY).send(body).expect(200);
    expect(first.body).toMatchObject({ accepted: 2, duplicates: 0 });
    const again = await request(app).post('/api/device/events').set('X-Device-Key', KEY).send(body).expect(200);
    expect(again.body).toMatchObject({ accepted: 0, duplicates: 2 });
    expect(await prisma.safeEvent.count({ where: { deviceId: device.id, uid: { startsWith: '42-' } } })).toBe(2);
  });

  it('loại sự kiện lạ hoặc JSON hỏng bị 422', async () => {
    await request(app)
      .post('/api/device/events')
      .set('X-Device-Key', KEY)
      .send({ boot_id: 1, events: [ev(1, 'HACKED')] })
      .expect(422);
    await request(app)
      .post('/api/device/events')
      .set('X-Device-Key', KEY)
      .set('Content-Type', 'application/json')
      .send('{"boot_id":')
      .expect(422);
  });

  it('ts = 0 thì dùng giờ server, ALARM được gán mức critical', async () => {
    await request(app)
      .post('/api/device/events')
      .set('X-Device-Key', KEY)
      .send({ boot_id: 7, events: [ev(1, 'ALARM', { ts: 0, state: 'ALARM', meta: { reason: 'TAMPER' } })] })
      .expect(200);
    const row = await prisma.safeEvent.findFirst({ where: { uid: '7-1' } });
    expect(row.severity).toBe('critical');
    expect(Date.now() - row.occurredAt.getTime()).toBeLessThan(10000);
    expect(row.meta).toEqual({ reason: 'TAMPER' });
  });

  it('heartbeat cập nhật thiết bị', async () => {
    const res = await request(app)
      .post('/api/device/heartbeat')
      .set('X-Device-Key', KEY)
      .send({ state: 'LOCKED', rssi: -61, ip: '192.168.1.50', uptime: 99, time_ok: true, fw: '1.1.0', free_heap: 1000 })
      .expect(200);
    expect(res.body.server_time).toBeGreaterThan(0);
    const d = await prisma.device.findUnique({ where: { id: device.id } });
    expect(d).toMatchObject({ state: 'LOCKED', rssi: -61, fw: '1.1.0', timeOk: true });
    expect(d.lastSeenAt).toBeInstanceOf(Date);
  });
});

describe('Dashboard', () => {
  it('bắt đăng nhập', async () => {
    await request(app).get('/dash-api/devices').expect(401);
    await request(app).get('/dash-api/devices').set('Authorization', 'Bearer invalid').expect(401);
  });

  it('thêm/xóa thẻ làm tăng version mà ESP32 nhận được', async () => {
    const v0 = (await request(app).get('/api/device/cards').set('X-Device-Key', KEY)).body.version;

    const add = await dashboard('post', '/dash-api/cards').send({ deviceId: device.id, uid: 'de:ad:be:ef', name: 'Tùng' }).expect(201);
    expect(add.body.uid).toBe('DE AD BE EF');
    await dashboard('post', '/dash-api/cards').send({ deviceId: device.id, uid: 'DEADBEEF', name: 'Trùng' }).expect(409);

    let esp = (await request(app).get('/api/device/cards').set('X-Device-Key', KEY)).body;
    expect(esp).toEqual({ version: v0 + 1, cards: ['DE AD BE EF'] });

    await dashboard('delete', `/dash-api/cards/${add.body.id}`).expect(200);
    esp = (await request(app).get('/api/device/cards').set('X-Device-Key', KEY)).body;
    expect(esp).toEqual({ version: v0 + 2, cards: [] });
  });

  it('thẻ lạ quẹt gần đây hiện trong danh sách chờ cấp quyền', async () => {
    await request(app)
      .post('/api/device/events')
      .set('X-Device-Key', KEY)
      .send({ boot_id: 9, events: [ev(1, 'CARD_UNKNOWN', { state: 'LOCKED', meta: { uid: '04 A1 B2 C3' } })] })
      .expect(200);
    const res = await dashboard('get', `/dash-api/cards/unknown?deviceId=${device.id}`).expect(200);
    expect(res.body).toEqual([expect.objectContaining({ uid: '04 A1 B2 C3', count: 1 })]);
  });

  it('lọc sự kiện theo mức độ và phân trang', async () => {
    const res = await dashboard('get', '/dash-api/events?severity=critical&page=1').expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({ type: 'ALARM', deviceName: 'Két test' });
    const stats = await dashboard('get', '/dash-api/stats?days=14').expect(200);
    expect(stats.body.days).toHaveLength(14);
    expect(stats.body.today.critical).toBe(1);
  });
});
