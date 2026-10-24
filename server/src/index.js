import http from 'node:http';
import os from 'node:os';
import { createApp } from './app.js';
import { config } from './config.js';
import { startPresenceWatcher } from './services/devices.js';
import { telegramEnabled } from './services/telegram.js';
import { initSocket } from './socket.js';

const server = http.createServer(createApp());
initSocket(server);
startPresenceWatcher();

server.listen(config.port, config.host, () => {
  console.log(`Server: http://localhost:${config.port}`);
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  for (const ip of ips) console.log(`  API_BASE cho ESP32: "http://${ip}:${config.port}/api/device"`);
  console.log(`  Telegram: ${telegramEnabled ? 'bật' : 'tắt'}`);
});
