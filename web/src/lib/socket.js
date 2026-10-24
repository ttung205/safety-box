import { io } from 'socket.io-client';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { handleUnauthorized } from './api.js';

// Kết nối Socket.IO (tự kết nối lại, tự chuyển long-polling khi WebSocket bị chặn).
export const socket = io({ autoConnect: false });
export const connected = ref(false);

const resyncHandlers = new Set();
let everConnected = false;

socket.on('connect', () => {
  connected.value = true;
  // Kết nối lại sau khi rớt mạng: gọi lại API để bù các sự kiện bị lỡ.
  if (everConnected) resyncHandlers.forEach((fn) => fn());
  everConnected = true;
});
socket.on('disconnect', () => (connected.value = false));
socket.on('connect_error', (err) => {
  connected.value = false;
  if (err.message === 'UNAUTHORIZED') {
    socket.disconnect();
    handleUnauthorized();
  }
});

export function connectSocket() {
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  everConnected = false;
  socket.disconnect();
}

// Đăng ký sự kiện realtime trong component, tự hủy khi rời trang.
export function useSocketEvent(event, handler) {
  onMounted(() => socket.on(event, handler));
  onBeforeUnmount(() => socket.off(event, handler));
}

export function useResync(handler) {
  onMounted(() => resyncHandlers.add(handler));
  onBeforeUnmount(() => resyncHandlers.delete(handler));
}
