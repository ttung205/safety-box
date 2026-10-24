#pragma once

// ESP32 chỉ hỗ trợ Wi-Fi 2.4 GHz.
#define WIFI_SSID "ten-wifi"
#define WIFI_PASS "mat-khau-wifi"

// Local: http://<IP-may-tinh>:3000/api/device
// Vercel: https://<ten-app>.vercel.app/api/device
#define API_BASE "https://<ten-app>.vercel.app/api/device"

// Lấy từ: npm run device:create -w server -- "Két sắt 01"
#define DEVICE_KEY "device-key"

// Tạo bằng python gen_secret.py, sau đó thêm cùng khóa vào ứng dụng Authenticator.
#define TOTP_SECRET_B32 "totp-secret-base32"
