// Loại sự kiện firmware gửi lên và mức độ tương ứng.
export const SEVERITY_BY_TYPE = {
  ALARM: 'critical',
  CARD_UNKNOWN: 'warning',
  OTP_WRONG: 'warning',
  OTP_TIMEOUT: 'warning',
  BOOT: 'info',
  CARD_ADMIN: 'info',
  OPENED: 'info',
  LOCKED: 'info',
  ALARM_RESET: 'info',
  VIBRATION: 'info',
};

export const EVENT_TYPES = Object.keys(SEVERITY_BY_TYPE);
export const SEVERITIES = ['critical', 'warning', 'info'];
export const STATES = ['LOCKED', 'WAIT_OTP', 'OPEN', 'ALARM'];
