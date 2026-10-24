# Cảm biến rung SW-420 cho két sắt thông minh

Oct 22, 2026 · @ttung

## Vì sao chọn SW-420

SW-420 hợp với két sắt hơn cảm biến âm thanh vì nó đo rung cơ học của chính vỏ két, không đo âm thanh trong không khí. Tiếng nói chuyện, vỗ tay hay tiếng ồn trong phòng bảo vệ không làm nó kích hoạt.

Nguyên lý hoạt động:

- Bên trong có một công tắc rung gồm lò xo và tiếp điểm, bình thường ở trạng thái đóng. Khi vỏ két rung, tiếp điểm nảy và đóng ngắt liên tục.
- IC so sánh LM393 biến tín hiệu đó thành xung ở chân DO. Biến trở xanh dùng để chỉnh độ nhạy.
- Để yên thì DO ở mức LOW. Khi rung, DO lên HIGH thành từng chuỗi xung; rung càng mạnh và càng lâu thì chuỗi xung càng dài.
- Đa số module chỉ có chân DO, không có chân AO.

## Thay đổi so với kế hoạch cũ

Chuyển sang SW-420 chỉ đổi ít phần cứng, nhưng thuật toán lọc và cơ chế tạm bỏ qua cảm biến cần làm lại.

### 1. Chân cắm

DO vẫn nối GPIO34. Chân AO (GPIO35) không dùng nữa nên được giải phóng. Module chạy được ở 3.3V.

### 2. Thuật toán lọc: đo thêm thời gian rung

Một tiếng gõ của SW-420 tạo ra cả chùm xung do tiếp điểm nảy, nên chỉ đếm số xung thì khó phân biệt gõ nhẹ với cạy. Dùng hai chỉ số trong mỗi cửa sổ 1 giây:

- Số lần va đập: các xung cách nhau dưới khoảng 20 ms được gộp thành một lần va đập.
- Tổng thời gian DO ở mức HIGH, đo bằng ngắt `CHANGE`.

Báo động khi đạt ngưỡng ở một trong hai chỉ số, ví dụ từ 4 lần va đập trong 1 giây, hoặc rung tổng cộng từ 250 ms trở lên. Cạy hoặc khoan tạo rung kéo dài nên vượt ngưỡng thời gian rất nhanh, còn gõ một cái thì không.

### 3. Tạm bỏ qua cảm biến lâu hơn

SW-420 nhạy với chính các thao tác trên két hơn cảm biến âm thanh.

| Nguồn rung | Thời gian bỏ qua cảm biến |
| --- | --- |
| Bấm keypad gắn trên cửa két | Khoảng 300 ms sau mỗi lần bấm |
| Servo quay và đóng cửa két | Khoảng 3 giây sau khi khóa lại |

### 4. Lắp đặt

Vít hoặc dán chặt module bằng băng keo hai mặt cường lực vào thành trong của két. Không treo lỏng, vì module lắc tự do sẽ tự kích hoạt. Hướng đặt không ảnh hưởng nhiều.

### 5. Serial Plotter

Không còn chân AO nên không vẽ được dạng sóng âm. Thay vào đó vẽ thời gian rung trong mỗi 50 ms: để yên thì đường phẳng, cạy thì nhảy vọt.

## Kịch bản demo phần cảm biến

Bốn thao tác, làm theo thứ tự từ không báo động đến báo động, để hội đồng thấy bộ lọc hoạt động.

| Thao tác | Kết quả mong đợi |
| --- | --- |
| Nói to, vỗ tay sát két | Không có gì xảy ra. Đây là điểm hơn hẳn cảm biến âm thanh, nên nói rõ khi demo |
| Gõ nhẹ một cái lên nóc két | Log "rung ngắn, bỏ qua" (sự kiện VIBRATION), không báo động |
| Bấm keypad nhập OTP | Không báo động nhờ cơ chế tạm bỏ qua cảm biến |
| Cạy hoặc gõ liên tục vào cửa | Vượt ngưỡng, báo động; dashboard và Telegram nhận cảnh báo ngay |

## Sửa trong báo cáo

Bốn chỗ trong báo cáo cần cập nhật theo cảm biến mới.

| Mục | Nội dung sửa |
| --- | --- |
| Linh kiện | Đổi "Cảm biến âm thanh / chấn động (Sound Sensor)" thành "Cảm biến rung SW-420". Bỏ vòng LED RGB và còi buzzer khỏi khối Cơ cấu chấp hành & Hiển thị |
| Máy trạng thái | Thay "LED vàng / xanh / nháy đỏ" và "còi hú" bằng LCD hiển thị trạng thái. STATE\_ALARM: LCD báo động, khóa cứng hệ thống và đẩy cảnh báo lên web dashboard |
| Ưu điểm | Bỏ "khò hàn", ghi "phát hiện va đập, cạy, khoan" |
| Nhược điểm (báo động giả) | Nêu bộ lọc hai chỉ số (số lần va đập và thời gian rung) cùng cơ chế tạm bỏ qua cảm biến khi két tự vận hành |
| Nhược điểm (cảnh báo tại chỗ) | Không có còi nên kẻ trộm không bị đánh động tại chỗ. Mất WiFi thì cảnh báo chỉ hiện trên LCD, sự kiện được lưu tạm và gửi bù khi có mạng lại |
| Hướng phát triển (tùy chọn) | Kết hợp cảm biến gia tốc MPU6050 để đo hướng và cường độ rung, hoặc công tắc từ ở cửa để phát hiện cửa bị mở khi két đang khóa |

## Hướng dẫn lắp ráp

Mọi linh kiện nối vào ESP32 DevKit V1 (ESP32-WROOM-32). Servo lấy điện từ một nguồn 5V riêng, và mọi GND phải nối chung. Dự án không dùng còi và vòng LED: trạng thái và báo động hiển thị trên LCD của két và trên web dashboard.

### Linh kiện cần chuẩn bị

- ESP32 DevKit V1, RFID RC522 kèm thẻ, LCD 1602 có mạch I2C (PCF8574), RTC DS3231 kèm pin CR2032, keypad 4x4, servo SG90, cảm biến rung SW-420.
- Adapter 5V 2A, tụ hóa 1000 µF 10V, breadboard, dây cắm.

### Bảng nối dây

| Linh kiện | Chân linh kiện | Nối tới | Ghi chú |
| --- | --- | --- | --- |
| RC522 | SDA (SS) | GPIO5 | Giao tiếp SPI |
| RC522 | SCK | GPIO18 |  |
| RC522 | MOSI | GPIO23 |  |
| RC522 | MISO | GPIO19 |  |
| RC522 | RST | GPIO27 |  |
| RC522 | 3.3V / GND | 3V3 / GND | Không cắm 5V. Chân IRQ để trống |
| LCD 1602 I2C | SDA / SCL | GPIO21 / GPIO22 | Chung bus I2C với DS3231 |
| LCD 1602 I2C | VCC / GND | 5V / GND | Cần 5V để đủ độ tương phản. Xem lưu ý I2C bên dưới |
| DS3231 | SDA / SCL | GPIO21 / GPIO22 | Mắc song song với LCD |
| DS3231 | VCC / GND | 3V3 / GND |  |
| Keypad 4x4 | Hàng R1, R2, R3, R4 | GPIO32, 33, 25, 26 | 4 chân đầu tính từ trái |
| Keypad 4x4 | Cột C1, C2, C3, C4 | GPIO13, 14, 16, 17 | 4 chân sau |
| Servo SG90 | Dây cam (tín hiệu) | GPIO4 |  |
| Servo SG90 | Dây đỏ / nâu | 5V nguồn ngoài / GND chung | Không lấy 5V từ ESP32 |
| SW-420 | DO | GPIO34 | Chân chỉ đọc, có ngắt |
| SW-420 | VCC / GND | 3V3 / GND |  |
| Nguồn 5V 2A | + / − | Rail 5V và chân VIN của ESP32 / GND chung | Tụ 1000 µF mắc giữa 5V và GND, đặt gần servo |

### Lưu ý khi lắp

- **Chân cần tránh**: GPIO6–11 nối với flash, không dùng. GPIO12 là chân strapping, bị kéo lên lúc khởi động sẽ làm ESP32 không boot. GPIO34–39 chỉ đọc được và không có điện trở kéo nội.
- **I2C 5V và 3.3V**: nếu mạch I2C của LCD có điện trở kéo SDA/SCL lên 5V, nên thêm một mạch chuyển mức I2C 2 kênh giữa LCD và ESP32 để an toàn cho ESP32.
- **Pin DS3231**: module ZS-042 có mạch sạc dành cho pin LIR2032. Nếu dùng pin CR2032 (không sạc được), gỡ diode hoặc điện trở của mạch sạc trên module.
- **Keypad**: thứ tự chân mỗi loại keypad một khác. Chạy ví dụ HelloKeypad, nếu phím in ra bị lệch thì đảo thứ tự mảng hàng hoặc cột trong code.
- **Nguồn**: servo kéo dòng mạnh lúc quay. Nếu lấy điện từ USB, điện áp tụt có thể làm ESP32 khởi động lại. Khi đang nạp code qua USB vẫn giữ nguồn 5V ngoài và GND chung.

### Thứ tự lắp và kiểm tra

Lắp từng khối, kiểm tra xong mới lắp khối tiếp theo, để khi lỗi biết ngay nằm ở đâu.

1. **ESP32 riêng**: nạp sketch in ra Serial để kiểm tra board và driver USB.
2. **I2C (LCD + DS3231)**: chạy sketch I2C Scanner. Kết quả đúng là thấy 0x27 (hoặc 0x3F) cho LCD và 0x68 cho DS3231. Module ZS-042 có thêm 0x57 là chip EEPROM.
3. **RC522**: chạy ví dụ DumpInfo, quẹt thẻ và ghi lại UID của thẻ Admin.
4. **Keypad**: chạy HelloKeypad, bấm đủ 16 phím để kiểm tra.
5. **Servo (đã có nguồn ngoài)**: cho quay qua lại 0° và 90°, chỉnh cơ cấu chốt cho khớp.
6. **SW-420**: cố định chặt vào thành két, vặn biến trở trong lúc nhìn LED trên module hoặc Serial. Mục tiêu là gõ nhẹ chỉ ra 1–2 xung, còn cạy thì ra xung liên tục.
7. **Nạp firmware hoàn chỉnh** và chạy lại toàn bộ kịch bản demo.

## Kế hoạch làm web dashboard

Dashboard gồm backend Express.js nhận sự kiện từ ESP32 và giao diện Vue 3 + PrimeVue hiển thị realtime qua Socket.IO. Hệ thống chỉ nhận dữ liệu, không có lệnh mở két từ xa.

&#91;embedded content: kiến trúc dashboard · 6 thành phần\]

ESP32 đẩy dữ liệu lên Express, Express lưu vào MySQL qua Prisma rồi phát qua Socket.IO tới dashboard. Dashboard chỉ gọi `/dash-api` để đọc dữ liệu, không có đường nào gửi lệnh ngược về két.

### Công nghệ

| Phần | Công nghệ |
| --- | --- |
| Backend | Node.js 20+, Express 5 |
| Cơ sở dữ liệu | MySQL qua Prisma ORM (SQLite khi phát triển) |
| Realtime | Socket.IO, gắn chung server HTTP với Express |
| Đăng nhập | express-session + bcrypt, cookie httpOnly |
| Kiểm tra dữ liệu | zod |
| Giao diện | Vue 3 + Vite + PrimeVue 4 (theme Aura), vue-router |
| Biểu đồ | Component Chart của PrimeVue (dùng Chart.js) |
| Thông báo (tùy chọn) | Telegram Bot API, gọi bằng fetch |
| Test | Vitest + Supertest |

Cấu trúc thư mục đề xuất:

```text
ket-sat-dashboard/
├─ server/
│  ├─ prisma/schema.prisma
│  └─ src/
│     ├─ app.js                 # Express, session, helmet, routes
│     ├─ socket.js              # Socket.IO dùng chung session
│     ├─ routes/device.js       # /api/device/*
│     ├─ routes/auth.js         # /auth/*
│     ├─ routes/dash.js         # /dash-api/*
│     ├─ middleware/            # deviceAuth.js, requireAuth.js
│     ├─ services/              # ingest.js, telegram.js
│     └─ scripts/               # createDevice.js, seedAdmin.js, simulate.js
└─ web/                         # Vue 3 + PrimeVue (Vite)
   └─ src/
      ├─ pages/                 # LoginPage.vue, DashboardPage.vue
      ├─ components/            # DeviceCard, AlarmBanner, AlertsChart, EventTable
      └─ lib/                   # api.js, socket.js, labels.js
```

Khi phát triển, Vite proxy các đường dẫn `/api`, `/dash-api`, `/auth`, `/socket.io` sang Express ở cổng 3000. Khi chạy thật, Express phục vụ luôn thư mục `web/dist`.

### API cho ESP32

Mọi request đều gửi header `X-Device-Key`. Server chỉ lưu mã sha256 của khóa, không lưu khóa gốc.

| Endpoint | Nội dung gửi | Phản hồi |
| --- | --- | --- |
| `POST /api/device/events` | `boot_id` và mảng `events` (tối đa 50 sự kiện mỗi lô) | 200 đã nhận · 401 sai khóa · 422 dữ liệu sai, firmware bỏ lô đó |
| `POST /api/device/heartbeat` | `state`, `rssi`, `ip`, `uptime`, `time_ok`, `fw`, gửi mỗi 20 giây | 200 kèm `server_time` |

```json
{ "boot_id": 123, "events": [ { "seq": 1, "ts": 1761123456, "type": "ALARM",
  "state": "ALARM", "message": "BÁO ĐỘNG: phát hiện cạy phá",
  "meta": { "reason": "TAMPER", "hits": 6, "vibration_ms": 420 } } ] }
```

Cặp `boot_id` + `seq` ghép thành `uid` duy nhất, nên ESP32 gửi lại khi lỗi mạng cũng không bị ghi trùng. Nếu `ts` bằng 0 hoặc lệch quá xa, server dùng giờ nhận.

### Cơ sở dữ liệu

| Bảng (model Prisma) | Cột chính | Ghi chú |
| --- | --- | --- |
| `devices` (`Device`) | `name`, `apiKeyHash`, `state`, `ip`, `rssi`, `fw`, `timeOk`, `uptime`, `lastSeenAt` | Không thấy heartbeat quá 60 giây thì coi là mất kết nối |
| `safe_events` (`SafeEvent`) | `deviceId`, `uid`, `type`, `severity`, `state`, `message`, `meta` (Json), `occurredAt` | `@@unique([deviceId, uid])`; index `type`, `severity`, `occurredAt` |
| `users` (`User`) | `email`, `passwordHash`, `name` | Tạo admin bằng `npm run seed:admin` từ `ADMIN_EMAIL` / `ADMIN_PASSWORD` |

### Loại sự kiện

| Mức độ | Loại sự kiện |
| --- | --- |
| critical | ALARM |
| warning | CARD\_UNKNOWN, OTP\_WRONG, OTP\_TIMEOUT |
| info | BOOT, CARD\_ADMIN, OPENED, LOCKED, ALARM\_RESET, VIBRATION |

### API cho giao diện

Các route này yêu cầu session đăng nhập, kiểm tra bằng middleware `requireAuth` (trừ `/auth/login`).

| Route | Dữ liệu trả về |
| --- | --- |
| `POST /auth/login`, `POST /auth/logout` | Đăng nhập / đăng xuất, lưu `userId` vào session |
| `GET /auth/me` | Người đang đăng nhập; vue-router dùng để chặn trang khi chưa đăng nhập |
| `GET /dash-api/devices` | Danh sách két: trạng thái, online, RSSI, lần cuối thấy |
| `GET /dash-api/events?type=&severity=&deviceId=&page=` | Lịch sử sự kiện có lọc, 20 dòng mỗi trang, kèm tổng số dòng cho DataTable |
| `GET /dash-api/stats?days=14` | Số sự kiện theo ngày (giờ Việt Nam) và mức độ, số liệu hôm nay, lần báo động gần nhất |

### Realtime

- Socket.IO gắn chung server HTTP với Express và dùng chung `sessionMiddleware` (`io.engine.use(...)`). Kết nối không có `userId` trong session bị từ chối, kết nối hợp lệ được cho vào phòng `dashboard`.
- Sau khi lưu, service ingest phát `io.to('dashboard').emit('event:created', ...)` và `device:updated`.
- Gửi Telegram chạy sau khi đã trả lời ESP32 và bọc try/catch, nên lỗi mạng tới Telegram không làm hỏng việc lưu sự kiện.
- Socket.IO tự kết nối lại và tự chuyển sang long-polling khi WebSocket bị chặn. Khi kết nối lại, giao diện gọi lại `/dash-api` để bù các sự kiện bị lỡ.

### Giao diện

- **Trang đăng nhập**: `Card`, `InputText`, `Password`, `Button`, `Message` báo lỗi.
- **Thẻ trạng thái két**: `Card` + `Tag` màu theo trạng thái (Khóa / Chờ OTP / Mở / Báo động), kèm online/offline, RSSI, giờ đã đồng bộ hay chưa.
- **Banner báo động**: `Message` severity `error` cố định trên cùng kèm âm thanh khi có ALARM, tự ẩn khi có ALARM\_RESET. Mỗi sự kiện warning/critical mới hiện thêm một `Toast`.
- **Thẻ tổng quan hôm nay**: ba `Card` nhỏ cho số sự kiện critical, warning, info.
- **Biểu đồ**: `Chart` dạng cột chồng theo mức độ, số cảnh báo theo ngày trong 14 ngày.
- **Bảng sự kiện**: `DataTable` chế độ lazy có phân trang, lọc loại bằng `MultiSelect` và mức độ bằng `Select`, cột mức độ hiển thị bằng `Tag`. Dòng mới chèn lên đầu khi nhận realtime.
- Thư mục `lib/`: `api.js` (fetch kèm cookie, gặp 401 thì chuyển về trang đăng nhập), `socket.js` (kết nối Socket.IO), `labels.js` (nhãn tiếng Việt và màu cho từng loại sự kiện).

### Quản lý thẻ Admin

Thẻ Admin được thêm và xóa trên web, không ghi cứng trong firmware. ESP32 tải danh sách mỗi 30 giây và lưu vào bộ nhớ trong (NVS), nên khi mất mạng vẫn dùng được danh sách gần nhất.

| Phần | Chi tiết |
| --- | --- |
| Bảng `cards` (`Card`) | `deviceId`, `uid` (dạng `DE AD BE EF`, chữ in hoa), `name` (chủ thẻ), `createdAt`; unique (`deviceId`, `uid`). Thêm cột `cardsVersion` (số nguyên, bắt đầu từ 1) vào `devices`, tăng 1 mỗi lần thêm hoặc xóa thẻ |
| `GET /api/device/cards` (ESP32 gọi) | Trả về `{"version": 3, "cards": ["DE AD BE EF", "04 A1 B2 C3"]}`. ESP32 chỉ cập nhật khi `version` thay đổi |
| `GET /dash-api/cards` | Danh sách thẻ của từng két |
| `POST /dash-api/cards` | Thêm thẻ: `deviceId`, `uid`, `name` |
| `DELETE /dash-api/cards/:id` | Xóa thẻ |
| `GET /dash-api/cards/unknown` | Các UID lạ quẹt gần đây, lấy từ sự kiện `CARD_UNKNOWN` |

Cách thêm thẻ mới không cần gõ UID: quẹt thẻ lạ vào két, thẻ hiện trong mục "Thẻ lạ gần đây" trên trang Quản lý thẻ, admin bấm **Cấp quyền** và đặt tên. Trong tối đa 30 giây, két nhận thẻ đó. Giao diện dùng `DataTable` cho danh sách, `Dialog` + `InputText` để đặt tên, `ConfirmDialog` trước khi xóa.

### Bảo mật

- Không có endpoint mở két từ xa. Mở két luôn cần thẻ và OTP tại chỗ.
- Khóa thiết bị chỉ hiển thị một lần lúc tạo, có thể cấp lại bằng `--rotate`.
- Giới hạn tần suất bằng express-rate-limit: API thiết bị 120 request/phút, đăng nhập 5 lần/phút. Dùng helmet cho header bảo mật, cookie session đặt httpOnly và sameSite=lax.
- Triển khai thật dùng HTTPS. Demo trong mạng LAN có thể dùng HTTP.

### Các bước làm

- [ ] Tạo `server/` (cài express, prisma, @prisma/client, socket.io, express-session, bcrypt, zod, express-rate-limit, helmet) và `web/` (`npm create vue@latest`, cài primevue, @primeuix/themes, primeicons, chart.js, socket.io-client, vue-router)
- [ ] Viết `schema.prisma` với model `Device` (có `cardsVersion`), `SafeEvent`, `Card`, `User`, chạy `npx prisma migrate dev`
- [ ] Script `npm run device:create -- "Ket sat 01"`: tạo thiết bị, in DEVICE\_KEY một lần (thêm cờ `--rotate` để cấp lại)
- [ ] Script `npm run seed:admin` tạo tài khoản admin từ `.env`
- [ ] Middleware `deviceAuth` (so sha256 của `X-Device-Key`) và route `/api/device/events`, `/api/device/heartbeat`, validate bằng zod, trả 422 khi dữ liệu sai
- [ ] Route `GET /api/device/cards` trả `version` + danh sách UID cho ESP32
- [ ] Service ingest: tạo từng sự kiện, bắt lỗi trùng khóa `P2002` của Prisma để bỏ qua bản gửi lại, cập nhật trạng thái két, emit Socket.IO
- [ ] Đăng nhập: `/auth/login`, `/auth/logout`, `/auth/me` với express-session + bcrypt, middleware `requireAuth`
- [ ] Route `/dash-api/devices`, `/dash-api/events`, `/dash-api/stats`
- [ ] Route quản lý thẻ `/dash-api/cards` (GET, POST, DELETE, `unknown`), mỗi lần thêm/xóa thì tăng `cardsVersion`
- [ ] Socket.IO dùng chung session, cho vào phòng `dashboard` sau khi kiểm tra đăng nhập
- [ ] Script `npm run simulate` chạy kịch bản demo, thêm `--backfill 14` để sinh dữ liệu cho biểu đồ
- [ ] Giao diện Vue + PrimeVue: trang đăng nhập, trang dashboard (DeviceCard, AlarmBanner, AlertsChart, EventTable), trang Quản lý thẻ, Toast
- [ ] Cấu hình Vite proxy khi dev; Express phục vụ `web/dist` khi chạy thật
- [ ] Thông báo Telegram cho sự kiện critical (token trong `.env`)
- [ ] Test bằng Vitest + Supertest: sai khóa bị 401, gửi lại không trùng, loại lạ bị 422, heartbeat cập nhật thiết bị, thêm/xóa thẻ tăng version, dashboard bắt đăng nhập
- [ ] Ghép ESP32 thật: chạy server lắng nghe `0.0.0.0:3000`, đặt `API_BASE` trong `KetSat.ino` thành `http://<IP laptop>:3000/api/device`
