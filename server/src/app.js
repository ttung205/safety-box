import express from 'express';
import helmet from 'helmet';
import { requireAuth } from './middleware/requireAuth.js';
import { fcmEnabled } from './services/fcm.js';
import { pushEnabled } from './services/push.js';
import { dashRouter } from './routes/dash.js';
import { deviceRouter } from './routes/device.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));

  // CORS cho app Capacitor (WebView gọi từ origin https://localhost hoặc capacitor://localhost).
  // Xác thực vẫn bằng JWT trong header, không dùng cookie nên cho phép các origin này là an toàn.
  const appOrigins = new Set(['https://localhost', 'http://localhost', 'capacitor://localhost', 'ionic://localhost']);
  app.use(['/api', '/dash-api'], (req, res, next) => {
    const origin = req.get('origin');
    if (origin && appOrigins.has(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Chẩn đoán cấu hình (chỉ trả về true/false, không lộ giá trị nào).
  app.get('/api/health', (req, res) => res.json({ ok: true, fcm: fcmEnabled, webPush: pushEnabled }));

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

// Vercel Express runtime auto-detects src/app.js and requires a default export.
export default createApp();
