import { config } from '../config.js';

const { token, chatId, severities } = config.telegram;
export const telegramEnabled = Boolean(token && chatId);

const ICONS = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };

export async function sendTelegram(text) {
  if (!telegramEnabled) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.warn(`[TELEGRAM] HTTP ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.warn(`[TELEGRAM] Không gửi được: ${err.message}`);
  }
}

// Gọi sau khi đã trả lời ESP32; lỗi mạng tới Telegram không ảnh hưởng việc lưu sự kiện.
export async function notifyEvents(events) {
  for (const ev of events) {
    if (!telegramEnabled || !severities.includes(ev.severity)) continue;
    const time = new Date(ev.occurredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const lines = [`${ICONS[ev.severity]} ${ev.deviceName}`, ev.message, `Thời gian: ${time}`];
    if (ev.meta?.uid) lines.push(`UID thẻ: ${ev.meta.uid}`);
    await sendTelegram(lines.join('\n'));
  }
}
