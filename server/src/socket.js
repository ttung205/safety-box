import { Server } from 'socket.io';
import { sessionMiddleware } from './session.js';

let io = null;

// Socket.IO dùng chung session với Express; chỉ người đã đăng nhập mới vào phòng "dashboard".
export function initSocket(httpServer) {
  io = new Server(httpServer);
  io.engine.use(sessionMiddleware);
  io.use((socket, next) => {
    if (socket.request.session?.userId) return next();
    next(new Error('UNAUTHORIZED'));
  });
  io.on('connection', (socket) => socket.join('dashboard'));
  return io;
}

export function emitDashboard(event, payload) {
  io?.to('dashboard').emit(event, payload);
}
