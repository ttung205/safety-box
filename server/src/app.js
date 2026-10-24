import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { requireAuth } from './middleware/requireAuth.js';
import { authRouter } from './routes/auth.js';
import { dashRouter } from './routes/dash.js';
import { deviceRouter } from './routes/device.js';
import { sessionMiddleware } from './session.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Demo trong LAN chạy HTTP: tắt upgrade-insecure-requests để trình duyệt không ép tải tài nguyên qua HTTPS.
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
  app.use(express.json({ limit: '64kb' }));

  app.use('/api/device', deviceRouter);
  app.use(sessionMiddleware);
  app.use('/auth', authRouter);
  app.use('/dash-api', requireAuth, dashRouter);
  app.use(['/api', '/auth', '/dash-api'], (req, res) => res.status(404).json({ error: 'Không tìm thấy API.' }));

  // Chạy thật: Express phục vụ luôn bản build của giao diện (web/dist).
  if (fs.existsSync(config.webDist)) {
    app.use(express.static(config.webDist));
    app.get(/.*/, (req, res) => res.sendFile(path.join(config.webDist, 'index.html')));
  }

  app.use((err, req, res, next) => {
    // JSON hỏng: trả 422 để firmware bỏ lô đó.
    if (err.type === 'entity.parse.failed') return res.status(422).json({ error: 'JSON không hợp lệ' });
    console.error(err);
    res.status(500).json({ error: 'Máy chủ gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại.' });
  });
  return app;
}
