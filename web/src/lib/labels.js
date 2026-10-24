// Nhãn tiếng Việt + màu Tag cho loại sự kiện, mức độ và trạng thái két.
export const SEVERITIES = {
  critical: { label: 'Nghiêm trọng', tag: 'danger' },
  warning: { label: 'Cảnh báo', tag: 'warn' },
  info: { label: 'Thông tin', tag: 'secondary' },
};

export const EVENT_TYPES = {
  ALARM: 'Báo động',
  CARD_UNKNOWN: 'Quẹt thẻ lạ',
  OTP_WRONG: 'Nhập sai OTP',
  OTP_TIMEOUT: 'Hết thời gian OTP',
  BOOT: 'Khởi động',
  CARD_ADMIN: 'Quẹt thẻ Admin',
  OPENED: 'Mở két',
  LOCKED: 'Đóng két',
  ALARM_RESET: 'Tắt báo động',
  VIBRATION: 'Rung nhẹ',
};

export const STATES = {
  LOCKED: { label: 'Đang khóa', tag: 'success', icon: 'pi pi-lock' },
  WAIT_OTP: { label: 'Chờ nhập OTP', tag: 'warn', icon: 'pi pi-key' },
  OPEN: { label: 'Đang mở', tag: 'info', icon: 'pi pi-lock-open' },
  ALARM: { label: 'Báo động', tag: 'danger', icon: 'pi pi-exclamation-triangle' },
};

export const typeLabel = (t) => EVENT_TYPES[t] ?? t;
export const severityOf = (s) => SEVERITIES[s] ?? SEVERITIES.info;
export const stateOf = (s) => STATES[s] ?? { label: 'Chưa rõ', tag: 'secondary', icon: 'pi pi-question' };

const ALARM_REASONS = { TAMPER: 'Cạy phá', OTP_FAILS: 'Sai OTP quá số lần', REBOOT: 'Mất điện khi đang báo động' };
const BY = { card: 'Bằng thẻ', otp: 'Bằng mã OTP', keypad: 'Bằng bàn phím', auto: 'Tự động', test_key: 'Phím test' };

// Diễn giải trường meta của sự kiện thành một dòng ngắn.
export function describeMeta(meta) {
  if (!meta || typeof meta !== 'object') return '';
  const parts = [];
  if (meta.uid) parts.push(`UID ${meta.uid}`);
  if (meta.reason) parts.push(ALARM_REASONS[meta.reason] ?? meta.reason);
  if (meta.hits !== undefined) parts.push(`${meta.hits} va đập`);
  if (meta.vibration_ms !== undefined) parts.push(`rung ${meta.vibration_ms} ms`);
  if (meta.attempt !== undefined) parts.push(`lần ${meta.attempt}/${meta.max ?? '?'}`);
  if (meta.attempts !== undefined) parts.push(`${meta.attempts} lần sai`);
  if (meta.by) parts.push(BY[meta.by] ?? meta.by);
  if (meta.fw) parts.push(`FW ${meta.fw}`);
  if (meta.time_ok === false) parts.push('chưa có giờ');
  return parts.join(' · ');
}
