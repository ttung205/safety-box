import session from 'express-session';
import { config } from './config.js';

// MemoryStore đủ cho demo; khởi động lại server thì phải đăng nhập lại.
export const sessionMiddleware = session({
  name: 'ketsat.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 12 * 3600 * 1000,
  },
});
