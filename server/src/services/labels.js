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
  // Firmware 1.4.0
  LOCKOUT_END: 'info',
  DOOR_LEFT: 'warning',
  LATCH_FAIL: 'warning',
  WATCHDOG: 'critical',
  POWER_LOST: 'warning',
  POWER_RESTORED: 'info',
  BATT_LOW: 'warning',
  // Firmware 1.5.1: pin sắp cạn, két sắp tắt. Mức critical để điện thoại kêu dù đang tắt màn hình.
  BATT_EMPTY: 'critical',
};

export const EVENT_TYPES = Object.keys(SEVERITY_BY_TYPE);
export const SEVERITIES = ['critical', 'warning', 'info'];
export const STATES = ['LOCKED', 'WAIT_OTP', 'OPEN', 'ALARM', 'LOCKOUT'];
