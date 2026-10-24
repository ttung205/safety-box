import { ApiError, buildUrl, handleUnauthorized } from './api.js';
import { supabase } from './supabase.js';

// Tải file từ API cần JWT nên không dùng được link trực tiếp.
async function fetchFile(path, query) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let res;
  try {
    res = await fetch(buildUrl(path, query), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng.', 0);
  }
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error || `Máy chủ trả về lỗi HTTP ${res.status}.`, res.status);
  }
  const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'tai-xuong.csv';
  return new File([await res.blob()], name, { type: res.headers.get('Content-Type') || 'text/csv' });
}

// Điện thoại: mở bảng chia sẻ để lưu vào Tệp/Drive. Máy tính: tải xuống thường.
export async function downloadFile(path, query, { share = false } = {}) {
  const file = await fetchFile(path, query);
  if (share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
