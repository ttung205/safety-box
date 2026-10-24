import bcrypt from 'bcrypt';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { prisma } from '../prisma.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 60000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Đăng nhập sai quá 5 lần trong 1 phút. Vui lòng thử lại sau.' },
});

const loginSchema = z.object({ email: z.string().trim().toLowerCase(), password: z.string() });
// So sánh với hash giả khi không có email để thời gian phản hồi như nhau.
const DUMMY_HASH = bcrypt.hashSync('khong-dung', 10);

const toUserDto = (u) => ({ id: u.id, email: u.email, name: u.name });

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  const r = loginSchema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu.' });
  const user = await prisma.user.findUnique({ where: { email: r.data.email } });
  const ok = await bcrypt.compare(r.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.save((err2) => (err2 ? next(err2) : res.json(toUserDto(user))));
  });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('ketsat.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) return res.status(401).json({ error: 'Tài khoản không còn tồn tại.' });
  res.json(toUserDto(user));
});
