import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api.js';

// Thông báo đẩy gốc Android (FCM) cho app Capacitor. Trên web thì không làm gì.
export const isNativeApp = Capacitor.isNativePlatform();

let started = false;

// Hộp thoại hệ thống: thấy được ngay trên điện thoại mà không cần cắm máy tính đọc log.
// Chỉ hiện khi có lỗi hoặc đăng ký thành công (lần đầu), tối đa một lần mỗi lần mở app.
function report(message) {
  console.warn('[PUSH]', message);
  try {
    window.alert(message);
  } catch {
    // WebView không cho alert: bỏ qua.
  }
}

export async function startNativePush() {
  if (!isNativeApp || started) return;
  started = true;
  try {
    // Kênh báo động: ưu tiên tối đa -> kêu + rung + hiện cả khi màn hình khóa.
    await PushNotifications.createChannel({
      id: 'alarm',
      name: 'Báo động két sắt',
      description: 'Báo động khi có người cạy phá hoặc mở cưỡng bức',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#FF0000',
    });
    await PushNotifications.createChannel({
      id: 'events',
      name: 'Cảnh báo két sắt',
      importance: 3,
      visibility: 1,
      vibration: true,
    });

    PushNotifications.addListener('registration', async ({ value }) => {
      try {
        await api('/dash-api/push/fcm-token', { method: 'POST', body: { token: value } });
        report('Đã bật thông báo báo động trên máy này.');
      } catch (e) {
        report(`Không gửi được token lên máy chủ: ${e.message} (mã ${e.status ?? '?'})`);
      }
    });
    PushNotifications.addListener('registrationError', (e) =>
      report(`Firebase từ chối đăng ký: ${JSON.stringify(e)}`));

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === 'granted') await PushNotifications.register();
    else report(`Chưa được cấp quyền thông báo (trạng thái: ${perm.receive}). Vào Cài đặt > Ứng dụng > Két sắt > Thông báo để bật.`);
  } catch (e) {
    report(`Không bật được thông báo: ${e?.message ?? e}`);
  }
}
