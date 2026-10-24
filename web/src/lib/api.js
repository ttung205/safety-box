import { supabase } from './supabase.js';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function buildUrl(path, query = {}) {
  const url = new URL(path, location.origin);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    url.searchParams.set(k, Array.isArray(v) ? v.join(',') : v);
  }
  return url;
}

// Phiên hết hạn: quay về trang đăng nhập (import động để tránh vòng import với router).
export async function handleUnauthorized() {
  const [{ router }, { auth }] = await Promise.all([import('../router.js'), import('./auth.js')]);
  auth.user = null;
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
  }
}

// Fetch API kèm JWT của Supabase; gặp 401 thì chuyển về trang đăng nhập.
export async function api(path, { method = 'GET', body, query } = {}) {
  let res;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    res = await fetch(buildUrl(path, query), {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Vui lòng kiểm tra server đã chạy chưa.', 0);
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiError(data?.error || `Máy chủ trả về lỗi HTTP ${res.status}.`, res.status);
  return data;
}
