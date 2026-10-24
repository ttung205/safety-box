import { onBeforeUnmount, onMounted, ref } from 'vue';
import { handleUnauthorized } from './api.js';
import { supabase } from './supabase.js';

export const connected = ref(false);

const handlers = new Map();
const resyncHandlers = new Set();
let everConnected = false;
let channel = null;
let connecting = null;

function dispatch(event, payload) {
  for (const handler of handlers.get(event) || []) handler(payload);
}

// Adapter nhỏ để các store hiện tại giữ nguyên API on/off như trước đây.
export const socket = {
  on(event, handler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(handler);
  },
  off(event, handler) {
    handlers.get(event)?.delete(handler);
  },
};

export function connectSocket(accessToken) {
  if (channel) return accessToken ? supabase.realtime.setAuth(accessToken) : Promise.resolve();
  if (connecting) return connecting;
  connecting = (async () => {
    let token = accessToken;
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    }
    if (!token) return handleUnauthorized();

    await supabase.realtime.setAuth(token);
    channel = supabase.channel('dashboard', { config: { private: true } });
    for (const event of ['device:updated', 'event:created', 'cards:updated']) {
      channel.on('broadcast', { event }, ({ payload }) => dispatch(event, payload));
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        connected.value = true;
        dispatch('connect');
        if (everConnected) resyncHandlers.forEach((fn) => fn());
        everConnected = true;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        connected.value = false;
      }
    });
  })().finally(() => (connecting = null));
  return connecting;
}

export function disconnectSocket() {
  everConnected = false;
  connected.value = false;
  if (channel) supabase.removeChannel(channel);
  channel = null;
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
