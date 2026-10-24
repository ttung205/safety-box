# Plan: chuyển sang Supabase + deploy Vercel

## Quyết định đã chốt

- DB: **Supabase Postgres**, vẫn dùng Prisma.
- Đăng nhập: **Supabase Auth**, bỏ bảng `users` + bcrypt + express-session.
- Realtime: **Supabase Realtime Broadcast**, bỏ Socket.IO.
- Deploy: **chỉ Vercel**. Frontend là static (`web/dist`), backend Express chạy thành một Vercel Function.
- Dữ liệu cũ trong `dev.db`: **không chuyển**, tạo DB mới.

## Vì sao phải sửa nhiều hơn là chỉ đổi DB

Vercel chạy serverless: mỗi request có thể rơi vào một instance khác, và function bị dừng ngay sau khi trả response. Vì vậy:

| Hiện tại | Vấn đề trên Vercel | Thay bằng |
|---|---|---|
| SQLite `prisma/dev.db` | Ổ đĩa chỉ đọc, mỗi instance một bản riêng | Supabase Postgres |
| `express-session` lưu session trong RAM | Session không chia sẻ giữa các instance, người dùng bị đăng xuất ngẫu nhiên | Supabase Auth (JWT) |
| Socket.IO | Vercel không chạy được WebSocket server | Supabase Realtime Broadcast |
| `startPresenceWatcher` dùng `setInterval` | Không có tiến trình chạy nền | Frontend tự tính online từ `lastSeenAt` |
| `notifyEvents()` gửi Telegram sau khi đã trả response | Function có thể bị dừng trước khi gửi xong | `waitUntil()` từ `@vercel/functions` |
| `express-rate-limit` đếm trong RAM | Mỗi instance đếm riêng nên gần như vô tác dụng | Login: dùng rate limit của Supabase Auth. API thiết bị: bỏ |
| `bcrypt` (module native) | Có thể lỗi khi build | Bỏ, Supabase Auth đã xử lý mật khẩu |

Firmware đã hỗ trợ `https` + `setInsecure()`, chỉ cần đổi `API_BASE`.

---

## Bước 1: Tạo project Supabase

- [ ] Tạo project ở region **Southeast Asia (Singapore)**.
- [ ] Vào Authentication → Sign In / Providers, **tắt "Allow new users to sign up"**. Nếu để bật, ai cũng tự đăng ký được và xem được dashboard.
- [ ] Ghi lại các giá trị sau:
  - `DATABASE_URL`: chuỗi kết nối qua pooler (Transaction, cổng **6543**), thêm `?pgbouncer=true&connection_limit=1`.
  - `DIRECT_URL`: kết nối trực tiếp hoặc Session pooler (cổng **5432**), dùng khi chạy migrate.
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (secret).

## Bước 2: Database (Prisma → Postgres)

File `server/prisma/schema.prisma`:
- [ ] Đổi `provider = "postgresql"` và thêm `directUrl = env("DIRECT_URL")`.
- [ ] Xóa model `User`, vì người dùng giờ nằm trong `auth.users` của Supabase.
- [ ] Bỏ comment hướng dẫn chuyển sang MySQL.

Migration:
- [ ] Xóa `prisma/migrations/`, `prisma/dev.db`, `prisma/test.db`.
- [ ] Chạy `npx prisma migrate dev --name init` (trỏ vào Supabase).
- [ ] Tạo migration thứ hai `supabase_security` (viết SQL tay):
  ```sql
  -- Supabase mở schema public qua REST API bằng anon key, mà anon key thì công khai trong frontend.
  -- Bật RLS và không tạo policy nào: chỉ Prisma (role postgres, bỏ qua RLS) truy cập được.
  alter table devices     enable row level security;
  alter table safe_events enable row level security;
  alter table cards       enable row level security;

  -- Chỉ người đã đăng nhập mới được nghe kênh realtime "dashboard".
  create policy "dashboard listen" on realtime.messages
    for select to authenticated
    using (realtime.topic() = 'dashboard');
  ```

Code:
- [ ] `server/src/services/ingest.js`: thay vòng lặp `create` + bắt lỗi `P2002` bằng
      `prisma.safeEvent.createManyAndReturn({ data, skipDuplicates: true, include: { device: ... } })`.
      Lô 50 event sẽ chỉ còn 1 truy vấn thay vì 50 lượt gọi qua mạng. Số bản trùng = `events.length - created.length`.
- [ ] `server/package.json`: thêm `"postinstall": "prisma generate"`.
- [ ] `.env.example`: thay `DATABASE_URL="file:./dev.db"` bằng `DATABASE_URL` + `DIRECT_URL` của Supabase.

## Bước 3: Auth chuyển sang Supabase Auth

Server:
- [ ] Thêm `@supabase/supabase-js`. Tạo `server/src/supabase.js` chứa client dùng service role key (`auth: { persistSession: false }`).
- [ ] Xóa `src/session.js` và `src/routes/auth.js`. Gỡ `bcrypt` và `express-session`.
- [ ] Viết lại `middleware/requireAuth.js`:
  - Đọc header `Authorization: Bearer <jwt>`.
  - Kiểm tra bằng `supabase.auth.getClaims(token)`, hợp lệ thì gán `req.user = { id: claims.sub, email: claims.email }`.
  - Không hợp lệ thì trả 401 kèm thông báo tiếng Việt giống hiện tại.
- [ ] `app.js`: bỏ `sessionMiddleware` và route `/auth`, thêm `app.set('trust proxy', 1)`.
- [ ] `scripts/seedAdmin.js`: dùng
      `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })`.
      Nếu email đã tồn tại thì cập nhật mật khẩu bằng `updateUserById`.

Web:
- [ ] Thêm `@supabase/supabase-js`. Tạo `web/src/lib/supabase.js` từ `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
- [ ] `lib/auth.js`:
  - `login` dùng `supabase.auth.signInWithPassword`, đổi lỗi sang tiếng Việt ("Email hoặc mật khẩu không đúng.").
  - `logout` dùng `supabase.auth.signOut()`.
  - `fetchMe` dùng `supabase.auth.getSession()`. `auth.user = { id, email, name: user_metadata.name }`.
  - Lắng nghe `onAuthStateChange` để bắt trường hợp hết phiên (`SIGNED_OUT`) và gọi `handleUnauthorized()`.
- [ ] `lib/api.js`: lấy `access_token` từ `supabase.auth.getSession()` rồi gắn header `Authorization`. Bỏ `credentials: 'same-origin'`.
- [ ] `vite.config.js`: bỏ proxy `/auth` và `/socket.io`.

## Bước 4: Realtime chuyển sang Supabase Broadcast

Server:
- [ ] Xóa `src/socket.js`. Tạo `src/realtime.js` có `emitDashboard(event, payload)`, **giữ nguyên chữ ký hàm** để không phải sửa các chỗ gọi:
  ```js
  // REST broadcast, không cần mở kết nối WebSocket từ function
  fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ topic: 'dashboard', event, payload, private: true }] }),
  });
  ```
  Hàm này trả về promise. Các route phải `await` nó, hoặc bọc trong `waitUntil`, để chắc chắn tin được gửi trước khi function dừng.
- [ ] Đổi import `../socket.js` thành `../realtime.js` trong `routes/dash.js`, `services/ingest.js`, `services/devices.js`.
- [ ] `services/devices.js`: xóa `startPresenceWatcher` và map `lastOnline`. `toDeviceDto` vẫn trả `online` (đúng tại thời điểm trả về).
- [ ] `src/index.js`: bỏ `initSocket` và `startPresenceWatcher`, chỉ giữ để chạy local bằng `npm run dev`.

Web:
- [ ] Viết lại `lib/socket.js` bằng `supabase.channel('dashboard', { config: { private: true } })`,
      **giữ nguyên các export** `connected`, `useSocketEvent`, `useResync`, `connectSocket`, `disconnectSocket`, để các page và component không phải sửa.
  - Trước khi subscribe phải gọi `supabase.realtime.setAuth(access_token)`.
  - `.on('broadcast', { event }, ({ payload }) => handler(payload))`.
  - Khi status chuyển sang `SUBSCRIBED` thì đặt `connected = true`. Nếu đây là lần kết nối lại thì gọi các resync handler.
  - Gặp `CHANNEL_ERROR` hoặc `TIMED_OUT` thì đặt `connected = false`.
- [ ] Online/offline: thêm một timer 10 giây trong store, tính lại `online = Date.now() - lastSeenAt < OFFLINE_AFTER_SEC*1000`.
      `OFFLINE_AFTER_SEC` lấy từ `VITE_OFFLINE_AFTER_SEC` (mặc định 60).
- [ ] Gỡ `socket.io` (server) và `socket.io-client` (web).

## Bước 5: Đóng gói cho Vercel

- [ ] `package.json` ở gốc repo:
  ```json
  {
    "private": true,
    "type": "module",
    "workspaces": ["server", "web"],
    "scripts": { "build": "npm run build -w web" }
  }
  ```
- [ ] `api/index.js` ở gốc repo:
  ```js
  import { createApp } from '../server/src/app.js';
  export default createApp();
  ```
- [ ] `vercel.json`:
  ```json
  {
    "buildCommand": "npm run build",
    "outputDirectory": "web/dist",
    "regions": ["sin1"],
    "functions": { "api/index.js": { "maxDuration": 30 } },
    "rewrites": [
      { "source": "/api/:path*", "destination": "/api" },
      { "source": "/dash-api/:path*", "destination": "/api" },
      { "source": "/:path*", "destination": "/index.html" }
    ]
  }
  ```
- [ ] `server/src/app.js`: bỏ đoạn phục vụ `web/dist` (Vercel lo phần này).
      Helmet chỉ còn phục vụ JSON nên giữ cấu hình mặc định.
- [ ] `server/src/config.js`: bỏ `host`, `cookieSecure`, `sessionSecret`, `webDist`. Thêm `supabaseUrl` và `supabaseServiceKey`.
- [ ] `routes/device.js`:
  - Gỡ `express-rate-limit`.
  - Gửi Telegram bằng `waitUntil(notifyEvents(created))` (thêm package `@vercel/functions`).
- [ ] `routes/auth.js` đã xóa, nên cũng gỡ luôn `express-rate-limit` khỏi `package.json` nếu không còn chỗ nào dùng.
- [ ] Kiểm tra Prisma Client trên Vercel: Vercel build trên cùng môi trường với runtime nên thường không cần `binaryTargets`. Chỉ thêm `rhel-openssl-3.0.x` nếu gặp lỗi.

Env vars trên Vercel (Production + Preview):

| Biến | Dùng ở |
|---|---|
| `DATABASE_URL` | server (pooler 6543) |
| `DIRECT_URL` | chỉ dùng khi migrate |
| `SUPABASE_URL` | server |
| `SUPABASE_SERVICE_ROLE_KEY` | server (**không** có tiền tố `VITE_`) |
| `VITE_SUPABASE_URL` | web |
| `VITE_SUPABASE_ANON_KEY` | web |
| `OFFLINE_AFTER_SEC` / `VITE_OFFLINE_AFTER_SEC` | server / web |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_SEVERITIES` | server |

## Bước 6: Firmware, scripts, tests, tài liệu

- [ ] `safety-box.ino`: đổi `API_BASE` thành `"https://<ten-app>.vercel.app/api/device"`.
      Tăng timeout HTTP (`http.setTimeout`) lên khoảng 15 giây, vì lần gọi đầu có thể chậm hơn do cold start và bắt tay TLS.
- [ ] `scripts/createDevice.js`, `scripts/simulate.js`: vẫn chạy ở máy local qua Prisma với `DATABASE_URL` của Supabase.
      `simulate.js` gọi API theo URL, nên cho phép truyền base URL để test được trên bản deploy Vercel.
- [ ] Tests (`tests/globalSetup.js`, `tests/api.test.js`):
  - Chạy DB test trên Postgres: dùng Supabase CLI local (`supabase start`) hoặc một project Supabase riêng cho test.
  - Mock `requireAuth` (hoặc `supabase.auth.getClaims`) để không cần đăng nhập thật.
  - Mock `emitDashboard`.
  - Xóa các test của `/auth/*`.
- [ ] `README.md`: viết lại phần cài đặt (Supabase, env), phần chạy dev và phần deploy Vercel. Xóa mục "Chuyển sang MySQL".

## Bước 7: Deploy và kiểm tra

1. Ở local: `cd server && npx prisma migrate deploy` (dùng `DIRECT_URL`).
2. `npm run seed:admin` để tạo tài khoản admin trên Supabase Auth.
3. `npm run device:create -- "Ket sat 01"` để lấy `DEVICE_KEY` rồi nạp vào firmware.
4. Import repo vào Vercel (Root Directory = gốc repo), điền env vars, deploy.
5. Kiểm tra:
   - [ ] Đăng nhập được, F5 trang vẫn giữ đăng nhập, đăng xuất được.
   - [ ] Gọi `/dash-api/devices` không có token thì nhận 401.
   - [ ] Chạy `simulate` vào URL Vercel: event hiện realtime trên dashboard.
   - [ ] Thêm/xóa thẻ: ESP32 nhận được danh sách mới (`cardsVersion` tăng).
   - [ ] Ngắt ESP32 khoảng 60 giây: dashboard chuyển sang "mất kết nối".
   - [ ] Báo động: Telegram nhận được tin.
   - [ ] Gọi `curl $SUPABASE_URL/rest/v1/devices -H "apikey: <anon>"` nhận về `[]`, xác nhận RLS đang chặn.
   - [ ] Xuất CSV chạy được. Lưu ý giới hạn response 4.5 MB của Vercel; nếu vượt thì giảm `take` từ 20000 xuống.
