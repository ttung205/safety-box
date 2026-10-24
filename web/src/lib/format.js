const dateTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const shortDateTime = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (d) => (d ? dateTime.format(new Date(d)) : '—');
export const formatShort = (d) => (d ? shortDateTime.format(new Date(d)) : '—');

export function timeAgo(d, now = Date.now()) {
  if (!d) return 'Chưa kết nối lần nào';
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 10) return 'Vừa xong';
  if (s < 60) return `${s} giây trước`;
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return formatShort(d);
}

export function formatUptime(sec) {
  if (sec == null) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d ? `${d} ngày ${h} giờ` : h ? `${h} giờ ${m} phút` : `${m} phút`;
}

export function rssiLabel(rssi) {
  if (rssi == null) return '—';
  const q = rssi >= -60 ? 'Mạnh' : rssi >= -75 ? 'Trung bình' : 'Yếu';
  return `${rssi} dBm · ${q}`;
}
