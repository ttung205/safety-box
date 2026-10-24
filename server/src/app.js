import express from 'express';
import helmet from 'helmet';
import { requireAuth } from './middleware/requireAuth.js';
import { dashRouter } from './routes/dash.js';
import { deviceRouter } from './routes/device.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));

  app.use('/api/device', deviceRouter);
  app.use('/dash-api', requireAuth, dashRouter);
  app.use(['/api', '/dash-api'], (req, res) => res.status(404).json({ error: 'Không tìm thấy API.' }));

  app.use((err, req, res, next) => {
    // JSON hỏng: trả 422 để firmware bỏ lô đó.
    if (err.type === 'entity.parse.failed') return res.status(422).json({ error: 'JSON không hợp lệ' });
    console.error(err);
    res.status(500).json({ error: 'Máy chủ gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại.' });
  });
  return app;
}
