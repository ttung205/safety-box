import { prisma } from '../prisma.js';
import { hashKey } from '../services/devices.js';

export async function deviceAuth(req, res, next) {
  const key = req.get('X-Device-Key');
  const device = key && (await prisma.device.findUnique({ where: { apiKeyHash: hashKey(key) } }));
  if (!device) return res.status(401).json({ error: 'Sai DEVICE_KEY' });
  req.device = device;
  next();
}
