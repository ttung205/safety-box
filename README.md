# Két sắt thông minh – Web dashboard

- `safety-box.ino`: firmware ESP32.
- `server/`: Express 5 + Prisma/PostgreSQL, đóng gói thành Vercel Function.
- `web/`: Vue 3 + Vite, đăng nhập và realtime qua Supabase.

## 1. Tạo Supabase project

Tạo project ở region Singapore. Trong Authentication → Sign In / Providers, tắt **Allow new users to sign up**.

Sao chép `server/.env.example` thành `server/.env`, rồi điền:

- `DATABASE_URL`: Transaction pooler cổng 6543, thêm `?pgbouncer=true&connection_limit=1`.
- `DIRECT_URL`: direct connection hoặc Session pooler cổng 5432.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.

Sao chép `web/.env.example` thành `web/.env`, rồi điền URL và anon/publishable key của cùng project.

## 2. Cài đặt và khởi tạo

```bash
npm install
cd server
npx prisma migrate deploy
npm run seed:admin
npm run device:create -- "Ket sat 01"
```

Lệnh cuối in ra `DEVICE_KEY`. Dán khóa này vào `safety-box.ino`.

## Quản lý thẻ

Người dùng không nhập hoặc ghi nhớ UID. Trên web, chọn **Thêm thẻ mới**, nhập tên chủ thẻ,
nhấn **Bắt đầu quét** rồi quẹt thẻ vào đầu đọc RC522 trong vòng 60 giây. ESP32 gửi UID như
một sự kiện bảo mật, web nhận realtime và tự lưu thẻ. Khi xóa, chọn chủ thẻ trong danh sách
và nhấn **Xóa**; UID luôn được xử lý nội bộ.

## 3. Chạy local

Mở hai terminal tại gốc repo:

```bash
npm run dev -w server
npm run dev -w web
```

API chạy ở `http://localhost:3000`, giao diện ở `http://localhost:5173`. Vite proxy `/api` và `/dash-api` sang Express; Auth và Realtime kết nối thẳng Supabase.

## 4. Deploy Vercel

Import repo với Root Directory là gốc repo. Cấu hình các biến cho Production và Preview:

- `DATABASE_URL`, `DIRECT_URL`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `OFFLINE_AFTER_SEC`, `VITE_OFFLINE_AFTER_SEC`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_SEVERITIES` (nếu dùng)

Sau khi deploy, thay `API_BASE` trong firmware bằng `https://<ten-app>.vercel.app/api/device`, rồi nạp lại ESP32.

## 5. Giả lập và test

```bash
cd server
npm run simulate -- --url https://<ten-app>.vercel.app/api/device
npm run simulate -- --url https://<ten-app>.vercel.app/api/device --backfill 14
```

Integration test cần một Supabase/Postgres project riêng. Đặt `TEST_DATABASE_URL` và chạy `npm test -w server`; test sẽ xóa dữ liệu trong database test trước khi chạy.

## Telegram

Điền `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` trong `server/.env`. Mặc định chỉ gửi sự kiện `critical`; đổi `TELEGRAM_SEVERITIES=critical,warning` nếu muốn nhận thêm cảnh báo.
