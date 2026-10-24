import { config } from './config.js';

export async function emitDashboard(event, payload) {
  const response = await fetch(`${config.supabaseUrl}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      apikey: config.supabaseServiceKey,
      Authorization: `Bearer ${config.supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: [{ topic: 'dashboard', event, payload, private: true }] }),
  });
  if (!response.ok) throw new Error(`Supabase Realtime trả về HTTP ${response.status}: ${await response.text()}`);
}
