package vn.edu.ketsat.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Kênh phải khớp channelId mà server gửi trong FCM (server/src/services/fcm.js).
    public static final String ALARM_CHANNEL_ID = "alarm_siren";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createAlarmChannel();
    }

    // Còi hú 30 giây, phát theo âm lượng BÁO THỨC (không bị tắt khi máy ở chế độ im lặng) và rung dài.
    // Kênh thông báo không sửa được sau khi tạo, nên muốn đổi âm thì đổi ALARM_CHANNEL_ID.
    private void createAlarmChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel ch = new NotificationChannel(
                ALARM_CHANNEL_ID, "Báo động két sắt (còi hú)", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Còi hú 30 giây khi két bị cạy phá hoặc mở cưỡng bức");

        Uri siren = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.siren);
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        ch.setSound(siren, attrs);

        // Rung 0,8 giây, nghỉ 0,4 giây, lặp 25 lần ≈ 30 giây.
        long[] pattern = new long[1 + 25 * 2];
        pattern[0] = 0;
        for (int i = 0; i < 25; i++) {
            pattern[1 + i * 2] = 800;
            pattern[2 + i * 2] = 400;
        }
        ch.enableVibration(true);
        ch.setVibrationPattern(pattern);

        ch.enableLights(true);
        ch.setLightColor(0xFFFF0000);
        ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        ch.setBypassDnd(true); // chỉ có tác dụng nếu người dùng cấp quyền "Không làm phiền" cho app
        nm.createNotificationChannel(ch);
    }
}
