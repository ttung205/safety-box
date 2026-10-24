import { createApp } from './app.js';
import { config } from './config.js';
import { telegramEnabled } from './services/telegram.js';

createApp().listen(config.port, () => {
  console.log(`Server: http://localhost:${config.port}`);
  console.log(`  Telegram: ${telegramEnabled ? 'bật' : 'tắt'}`);
});
