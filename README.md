# Két sắt thông minh – Web dashboard

- `safety-box.ino`: firmware ESP32
- `server/`: Express 5 + Prisma + Socket.IO (API cho ESP32 và dashboard)
- `web/`: Vue 3 + Vite + PrimeVue 4 + Tailwind

## Cài đặt lần đầu

```bash
cd server
npm install
cp .env.example .env            # sửa SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma migrate dev          # tạo DB SQLite (prisma/dev.db)
npm run seed:admin              # tạo tài khoản đăng nhập web
npm run device:create -- "Ket sat 01"   # in ra DEVICE_KEY, dán vào safety-box.ino

cd ../web
npm install
```

Trong `safety-box.ino` đặt `API_BASE` = địa chỉ server in ra khi chạy `npm run dev`
(ví dụ `http://192.168.1.10:3000/api/device`) và `DEVICE_KEY` vừa tạo.

## Chạy khi phát triển

```bash
cd server && npm run dev        # http://localhost:3000 (API)
cd web && npm run dev           # http://localhost:5173 (giao diện, proxy sang 3000)
```

## Chạy khi demo

```bash
cd web && npm run build         # tạo web/dist
cd server && npm start          # Express phục vụ luôn giao diện tại http://<IP>:3000
```

## Demo khi chưa có két thật

```bash
cd server
npm run simulate                    # kịch bản: rung nhẹ, thẻ lạ, mở két, cạy phá, tắt báo động
npm run simulate -- --backfill 14   # thêm dữ liệu 14 ngày cho biểu đồ
```

Giả lập tạo một két tên "Két mô phỏng". Muốn xóa sạch dữ liệu thử thì xóa `server/prisma/dev.db`
rồi chạy lại `npx prisma migrate dev` và `npm run seed:admin`.

## Lệnh khác

| Lệnh (trong `server/`) | Tác dụng |
| --- | --- |
| `npm run device:create -- --list` | Xem danh sách két |
| `npm run device:create -- --rotate 1` | Cấp lại khóa cho két #1 |
| `npm test` | Chạy test API (Vitest + Supertest, DB riêng `prisma/test.db`) |

## Telegram (tuỳ chọn)

Điền `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` trong `server/.env`. Mặc định chỉ gửi sự kiện
mức `critical` (báo động); đổi `TELEGRAM_SEVERITIES=critical,warning` để nhận cả thẻ lạ / sai OTP.

## Chuyển sang MySQL

Trong `server/prisma/schema.prisma` đổi `provider = "mysql"`, đặt
`DATABASE_URL="mysql://user:pass@localhost:3306/ketsat"`, xóa thư mục `prisma/migrations` rồi chạy
`npx prisma migrate dev --name init`.
