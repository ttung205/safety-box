import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Khi test, vitest tự đặt biến môi trường (DB test riêng) nên không đọc .env.
if (process.env.NODE_ENV !== 'test') {
  try {
    process.loadEnvFile(path.join(rootDir, '.env'));
  } catch {
    // Chưa có .env: dùng biến môi trường sẵn có.
  }
}

const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-doi-ngay',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  offlineAfterMs: (Number(process.env.OFFLINE_AFTER_SEC) || 60) * 1000,
  maxCards: 20, // = MAX_CARDS trong firmware
  webDist: path.resolve(rootDir, '../web/dist'),
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    severities: list(process.env.TELEGRAM_SEVERITIES || 'critical'),
  },
};
