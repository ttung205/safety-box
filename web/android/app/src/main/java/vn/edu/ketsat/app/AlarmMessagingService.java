package vn.edu.ketsat.app;

import android.app.NotificationManager;
import android.service.notification.StatusBarNotification;

import androidx.annotation.NonNull;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

// Nhận tin FCM của plugin như cũ, thêm một lệnh riêng: data.action = "clear".
// Khi két hết báo động (admin quẹt thẻ) server gửi lệnh này, ta hủy thông báo báo động.
// Android dừng còi hú và rung ngay khi thông báo của nó bị hủy.
public class AlarmMessagingService extends MessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        if ("clear".equals(data.get("action"))) {
            clearAlarmNotifications();
            return; // lệnh nội bộ, không chuyển cho JS
        }
        super.onMessageReceived(message);
    }

    private void clearAlarmNotifications() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        // Thông báo báo động có tag "alarm-<id két>" (đặt bởi server trong fcm.js).
        for (StatusBarNotification sbn : nm.getActiveNotifications()) {
            String tag = sbn.getTag();
            if (tag != null && tag.startsWith("alarm-")) nm.cancel(tag, sbn.getId());
        }
    }
}
