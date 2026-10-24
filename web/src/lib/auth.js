import { reactive } from 'vue';
import { api } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';

export const auth = reactive({ user: null });

export async function fetchMe() {
  auth.user = await api('/auth/me');
  connectSocket();
  return auth.user;
}

export async function login(email, password) {
  auth.user = await api('/auth/login', { method: 'POST', body: { email, password } });
  connectSocket();
}

export async function logout() {
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
  auth.user = null;
  disconnectSocket();
}
