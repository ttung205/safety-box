import { reactive } from 'vue';
import { handleUnauthorized } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';
import { supabase } from './supabase.js';

export const auth = reactive({ user: null });

export async function fetchMe() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  auth.user = user ? { id: user.id, email: user.email, name: user.user_metadata?.name } : null;
  if (data.session) await connectSocket(data.session.access_token);
  return auth.user;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw new Error('Email hoặc mật khẩu không đúng.');
  auth.user = { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name };
  await connectSocket(data.session.access_token);
}

export async function logout() {
  await supabase.auth.signOut().catch(() => {});
  auth.user = null;
  disconnectSocket();
}

supabase.auth.onAuthStateChange((event, session) => {
  const user = session?.user;
  auth.user = user ? { id: user.id, email: user.email, name: user.user_metadata?.name } : null;
  if (event === 'SIGNED_OUT') {
    disconnectSocket();
    handleUnauthorized();
  } else if (session?.access_token) {
    connectSocket(session.access_token);
  }
});
