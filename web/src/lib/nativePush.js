import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api.js';

// Thông báo đẩy gốc Android (FCM) cho app Capacitor. Trên web thì không làm gì.
export const isNativeApp = Capacitor.isNativePlatform();

let started = false;

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
      } catch (e) {
        console.warn('Không gửi được token FCM lên server:', e.message);
      }
    });
    PushNotifications.addListener('registrationError', (e) => console.warn('Đăng ký FCM lỗi:', JSON.stringify(e)));

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === 'granted') await PushNotifications.register();
  } catch (e) {
    console.warn('Không bật được thông báo gốc:', e);
  }
}
