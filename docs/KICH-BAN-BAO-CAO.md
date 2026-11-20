# Kịch bản báo cáo: Két sắt thông minh IoT

> **Cách dùng:** thay "Người 1", "Người 2" bằng tên thật. Phần ⚠️ là chỗ cần bạn kiểm tra lại cho đúng thực tế trước khi báo cáo.
> Thời lượng dự kiến **20 phút** (15 phút trình bày + 3 phút demo + Q&A). Mỗi người nói khoảng một nửa.
> - **Người 1**: phần cứng và firmware (két).
> - **Người 2**: backend, cơ sở dữ liệu, web, PWA.

---

## 0. Tóm tắt trong 30 giây (dùng để mở đầu hoặc trả lời "dự án làm gì?")

Két sắt thông minh dùng **thẻ RFID kết hợp mã OTP 6 số** (giống Google Authenticator) để mở két. Két có **cảm biến rung chống cạy phá**, mọi sự kiện được gửi lên **web dashboard theo thời gian thực**, và **báo động về điện thoại** (thông báo đẩy + Telegram) kể cả khi chủ không mở ứng dụng. Chủ có thể ở xa mà vẫn **cho phép người khác mở két** bằng cách đọc mã OTP trên điện thoại.

---

## 1. Dòng thời gian trình bày

| # | Nội dung | Người nói | Thời lượng |
|---|---|---|---|
| 1 | Vấn đề và mục tiêu | Người 1 | 1:30 |
| 2 | Kiến trúc tổng thể | Người 1 | 1:30 |
| 3 | Phần cứng | Người 1 | 2:00 |
| 4 | Luồng mở két và OTP | Người 1 | 2:00 |
| 5 | Chống cạy phá và báo động | Người 1 | 1:30 |
| 6 | **Giao tiếp phần cứng ↔ phần mềm** (phần lõi) | Người 1 rồi Người 2 | 3:00 |
| 7 | Backend và cơ sở dữ liệu | Người 2 | 1:30 |
| 8 | Web dashboard và realtime | Người 2 | 1:30 |
| 9 | PWA, thông báo đẩy, Telegram | Người 2 | 1:30 |
| 10 | Bảo mật tổng hợp | Người 2 | 1:00 |
| 11 | Phân công công việc | Cả hai | 1:00 |
| 12 | **Demo trực tiếp** | Người 1 thao tác két, Người 2 thao tác web | 3:00 |
| 13 | Hạn chế, hướng phát triển, kết luận | Người 2 rồi Người 1 | 1:00 |

---

## 2. Lời thoại theo từng slide

### Slide 1: Vấn đề và mục tiêu (Người 1)

**Hiển thị:** tên đề tài, tên hai thành viên, ảnh mô hình két.

> "Chào thầy cô và các bạn. Nhóm em là [tên], hôm nay xin trình bày đề tài **Két sắt thông minh IoT**.
>
> Két sắt truyền thống có hai điểm yếu. Thứ nhất, khóa cơ hoặc mật khẩu cố định thì ai biết mật khẩu là mở được, và chủ không biết ai đã mở, mở lúc nào. Thứ hai, nếu có người cạy phá thì chủ chỉ biết khi đã quá muộn.
>
> Vì vậy nhóm đặt ba mục tiêu: **một**, xác thực hai lớp, phải có thẻ và phải có mã OTP đổi mỗi 30 giây. **Hai**, phát hiện cạy phá và báo ngay về điện thoại chủ. **Ba**, ghi lại toàn bộ lịch sử ra/vào để chủ xem từ xa."

### Slide 2: Kiến trúc tổng thể (Người 1)

**Hiển thị:** sơ đồ dưới đây.

```
  ┌─────────────── KÉT (ESP32) ───────────────┐
  │ RFID RC522 · Keypad 4x4 · LCD · Servo     │
  │ Cảm biến rung SW-420 · RTC DS3231         │
  └───────────────────┬───────────────────────┘
                      │  HTTPS + JSON, khóa thiết bị (X-Device-Key)
                      ▼
  ┌──────────── VERCEL (serverless) ──────────┐        ┌───────────┐
  │ API Express: /api/device  (cho ESP32)     │───────▶│ Telegram  │
  │              /dash-api    (cho web)       │        └───────────┘
  └───────┬──────────────────────┬────────────┘
          │ Prisma               │ Realtime Broadcast
          ▼                      ▼
  ┌────────────── SUPABASE ──────────────────────────────┐
  │ PostgreSQL (+RLS) · Auth (JWT) · Realtime            │
  └──────────────────────────┬───────────────────────────┘
                             │ WebSocket + JWT
                             ▼
  ┌──────── Web dashboard / PWA trên điện thoại ─────────┐
  │ Vue 3 · Thông báo đẩy (Web Push) khi đóng ứng dụng   │
  └──────────────────────────────────────────────────────┘
```

> "Hệ thống gồm ba lớp. **Lớp thiết bị** là két dùng vi điều khiển ESP32. **Lớp dịch vụ** là máy chủ chạy trên Vercel với cơ sở dữ liệu Supabase. **Lớp người dùng** là web dashboard, cài được lên điện thoại như một ứng dụng.
>
> Điểm quan trọng: két **chủ động gửi** dữ liệu lên máy chủ, không có chiều ngược lại. Web không thể gửi lệnh mở két. Đây là chủ ý thiết kế để không ai mở được két từ xa qua mạng."

### Slide 3: Phần cứng (Người 1)

**Hiển thị:** bảng linh kiện và ảnh mạch.

| Linh kiện | Vai trò | Giao tiếp với ESP32 |
|---|---|---|
| ESP32 Dev Module | Bộ xử lý trung tâm, có WiFi | n/a |
| RFID RC522 | Đọc thẻ Admin | SPI (GPIO 5, 18, 19, 23, 27) |
| Keypad 4x4 | Nhập OTP, đóng két | 8 chân GPIO quét ma trận |
| LCD 16x2 | Hiển thị giờ, trạng thái, OTP | I2C, địa chỉ 0x27 |
| RTC DS3231 | Giữ giờ chính xác khi mất điện | I2C (chung bus với LCD) |
| Servo | Chốt khóa: 0° khóa, 90° mở | PWM (GPIO 4) |
| Cảm biến rung SW-420 | Phát hiện va đập, cạy phá | Ngắt GPIO 34 |
| LED | Nhấp nháy khi sai OTP hoặc rung | GPIO 2 |

> "Em nói qua cách các linh kiện nối với ESP32. RFID dùng chuẩn **SPI**. LCD và đồng hồ RTC cùng nối trên một đường **I2C**, mỗi thiết bị có địa chỉ riêng nên không xung đột. Servo điều khiển bằng **PWM**. Còn cảm biến rung nối vào chân có **ngắt**, tức là mỗi lần có rung thì chip được báo ngay chứ không phải chờ hỏi liên tục.
>
> Đồng hồ RTC rất quan trọng: mã OTP phụ thuộc vào thời gian, nên két phải biết giờ chính xác kể cả khi mất mạng hoặc mất điện."

### Slide 4: Luồng mở két và OTP (Người 1)

**Hiển thị:** sơ đồ trạng thái.

```
        quẹt thẻ Admin                  nhập đúng OTP
 LOCKED ───────────────▶ WAIT_OTP ─────────────────────▶ OPEN
   ▲                        │  │                           │
   │      hết 30 giây       │  │ sai 3 lần                 │ bấm # hoặc
   │◀───────────────────────┘  ▼                           │ sau 60 giây
   │                         ALARM ◀── rung mạnh (cạy phá)  │
   │◀───── quẹt thẻ Admin tắt báo động ─┘                   │
   └────────────────────────────────────────────────────────┘
```

> "Két có bốn trạng thái. Muốn mở, người dùng **quẹt thẻ Admin** để qua lớp thứ nhất, sau đó **nhập 6 số OTP** trong 30 giây để qua lớp thứ hai. Nhập sai 3 lần liên tiếp thì két chuyển sang **báo động**. Đã mở thì két tự đóng sau 60 giây hoặc bấm phím #.
>
> Về OTP: két dùng chuẩn **TOTP, RFC 6238**, giống Google Authenticator. Nhóm tự cài đặt thuật toán **HMAC-SHA1** ngay trên ESP32. Khóa bí mật được tạo ngẫu nhiên 160 bit và đưa vào ứng dụng Authenticator bằng mã QR **một lần duy nhất**. Sau đó điện thoại và két **không cần kết nối với nhau**: mỗi bên tự tính mã từ cùng một khóa và cùng một thời điểm nên ra cùng kết quả.
>
> Có ba lớp phòng thủ cho OTP: cho phép lệch ±30 giây phòng đồng hồ lệch nhẹ, **mỗi mã chỉ dùng một lần** để chống dùng lại, và số lần sai được **lưu vào bộ nhớ flash** nên rút điện cũng không reset được.
>
> Tình huống thực tế: chủ đi vắng, người nhà cần mở két. Người nhà quẹt thẻ, chủ xem mã trên điện thoại rồi đọc cho họ nhập."

### Slide 5: Chống cạy phá và báo động (Người 1)

> "Cảm biến rung SW-420 gửi xung mỗi khi có va đập. Nếu chỉ báo động theo một xung thì gõ nhẹ cũng kêu, nên nhóm đánh giá theo **cửa sổ 1 giây**: báo động khi có **từ 4 va đập trở lên**, hoặc **tổng thời gian rung từ 250 mili giây trở lên**. Rung nhẹ dưới ngưỡng chỉ được ghi vào nhật ký.
>
> Để tránh báo nhầm, cảm biến **tạm bị bỏ qua** 0,3 giây sau mỗi lần bấm phím và 3 giây sau khi servo quay, vì hai việc này tự làm vỏ két rung. Khi két đang mở, cảm biến cũng tắt.
>
> Báo động có ba biểu hiện: LCD hiện cảnh báo và đèn nền nhấp nháy, LED nhấp nháy, và quan trọng nhất là gửi sự kiện lên máy chủ để đẩy về điện thoại. Trạng thái báo động được lưu vào flash, nên nếu kẻ trộm **rút điện** thì khi cấp điện lại két vẫn tiếp tục báo động."

### Slide 6: Giao tiếp phần cứng ↔ phần mềm (Người 1 nói phần két, Người 2 nói phần máy chủ)

**Hiển thị:** sơ đồ tuần tự.

```
 ESP32                                   Máy chủ                      Trình duyệt
   │                                        │                             │
   │ POST /api/device/heartbeat (20 giây)   │                             │
   │───────────────────────────────────────▶│ cập nhật "lần cuối thấy"    │
   │                                        │                             │
   │ POST /api/device/events  (lô ≤ 10)     │                             │
   │───────────────────────────────────────▶│ lưu DB (bỏ qua bản trùng)   │
   │◀── 200 {accepted, duplicates} ─────────│── Realtime broadcast ──────▶│ hiện ngay
   │                                        │── Web Push / Telegram ─────▶ điện thoại
   │ GET /api/device/cards (30 giây)        │                             │
   │───────────────────────────────────────▶│ trả version + danh sách UID │
   │◀── {version: 7, cards: ["DE AD ..."]} ─│                             │
```

**Người 1 (phía két):**

> "Két giao tiếp bằng **HTTPS và JSON**, chạy trong một **tác vụ FreeRTOS riêng ở lõi 0** của ESP32, tách biệt với vòng lặp điều khiển két ở lõi 1. Nhờ vậy mất mạng hay mạng chậm cũng **không làm đơ** việc quẹt thẻ hay nhập OTP.
>
> Mọi hành động như mở, đóng, quẹt thẻ lạ, nhập sai, rung, báo động đều thành một **sự kiện** đưa vào hàng đợi chứa tối đa 40 sự kiện. Tác vụ mạng lấy ra gửi theo lô tối đa 10 sự kiện. Nếu gửi lỗi thì **thử lại với thời gian chờ tăng dần** từ 2 giây tới 60 giây, nên mất mạng lâu cũng không mất dữ liệu.
>
> Mỗi sự kiện có mã duy nhất ghép từ **mã lần khởi động và số thứ tự**. Nếu két gửi lại một lô cũ thì máy chủ nhận ra và bỏ qua, không bị ghi trùng.
>
> Thẻ Admin thì ngược lại: người dùng thêm thẻ trên web, két **tự tải danh sách mới mỗi 30 giây** và **lưu vào bộ nhớ flash**. Nhờ vậy mất mạng két vẫn nhận đúng thẻ đã đăng ký. Để tiết kiệm, két chỉ tải lại khi **số phiên bản** danh sách thay đổi."

**Người 2 (phía máy chủ):**

> "Phía máy chủ, két được xác thực bằng một **khóa thiết bị** gửi trong header. Máy chủ chỉ lưu **mã băm SHA-256** của khóa này, nên dù lộ cơ sở dữ liệu cũng không lấy được khóa gốc. Dữ liệu vào được kiểm tra bằng schema, sai định dạng trả mã 422 để két bỏ lô đó thay vì gửi lại mãi.
>
> Mỗi nhịp tim 20 giây cho biết két còn sống. Quá 60 giây không có tín hiệu thì web hiện két **mất kết nối**.
>
> Sau khi lưu sự kiện, máy chủ làm ba việc song song: phát **realtime** tới mọi trình duyệt đang mở, gửi **thông báo đẩy** tới điện thoại, và gửi **Telegram**."

### Slide 7: Backend và cơ sở dữ liệu (Người 2)

| Thành phần | Công nghệ |
|---|---|
| Máy chủ | Node.js 22, Express 5, chạy dạng serverless trên **Vercel** |
| Cơ sở dữ liệu | **PostgreSQL trên Supabase**, truy cập qua **Prisma ORM** |
| Kiểm tra dữ liệu | Zod |
| Bảo vệ HTTP | Helmet |

**Các bảng:** `devices` (két và trạng thái), `safe_events` (nhật ký), `cards` (thẻ Admin), `push_subscriptions` (thiết bị nhận thông báo).

> "Máy chủ viết bằng Node.js và Express. Nhóm chọn **serverless trên Vercel** nên không phải thuê hay quản trị máy chủ, triển khai chỉ cần đẩy code lên GitHub.
>
> Cơ sở dữ liệu là PostgreSQL của Supabase. Có 10 loại sự kiện, chia 3 mức: **nghiêm trọng** (báo động), **cảnh báo** (thẻ lạ, sai OTP, hết giờ nhập) và **thông tin** (mở, đóng, khởi động, rung nhẹ). Phân mức ngay từ máy chủ để web và thông báo đẩy lọc được theo mức."

### Slide 8: Web dashboard và realtime (Người 2)

**Hiển thị:** ảnh chụp dashboard (máy tính và điện thoại).

> "Giao diện viết bằng **Vue 3**, thư viện thành phần **PrimeVue**, định dạng bằng **Tailwind CSS**, biểu đồ **Chart.js**. Gồm hai màn hình: **Tổng quan** có thẻ trạng thái két, thống kê hôm nay, biểu đồ cảnh báo theo ngày và bảng nhật ký có bộ lọc, xuất CSV; và **Quản lý thẻ**.
>
> Điểm đáng chú ý là cách thêm thẻ: người dùng nhập tên chủ thẻ rồi **quẹt thẻ thật vào két**, web tự nhận UID, không cần biết mã thẻ.
>
> Cập nhật tức thời dùng **Supabase Realtime**: máy chủ phát tin vào một kênh riêng tư, trình duyệt đã đăng nhập đang nghe kênh đó sẽ thấy sự kiện mới ngay mà không cần tải lại trang. ⚠️ *Thời gian từ lúc quẹt thẻ đến lúc web hiện, đo thực tế được khoảng [__] giây.*"

### Slide 9: PWA, thông báo đẩy, Telegram (Người 2)

> "Web được làm thành **PWA**: cài lên màn hình chính điện thoại, mở như ứng dụng, giao diện tự co giãn theo màn hình. Thanh điều hướng chuyển xuống đáy màn hình, bảng dữ liệu chuyển thành danh sách để dễ thao tác bằng ngón tay.
>
> Với két sắt, điều quan trọng nhất là **báo động phải đến được khi chủ không mở ứng dụng**. Nhóm dùng **Web Push** theo chuẩn VAPID: khi có báo động, máy chủ đẩy thông báo tới điện thoại, **kể cả khi đã đóng hẳn ứng dụng**. Ngoài ra có thêm kênh **Telegram** làm dự phòng.
>
> Service Worker của ứng dụng **chỉ lưu giao diện, không lưu dữ liệu két**, để chủ không bao giờ thấy trạng thái cũ."

### Slide 10: Bảo mật tổng hợp (Người 2)

| Lớp | Biện pháp |
|---|---|
| Mở két | Thẻ RFID + OTP 6 số (TOTP), mỗi mã dùng 1 lần |
| Brute-force OTP | Sai 3 lần là báo động, số lần sai lưu trong flash |
| Chống cạy phá | Cảm biến rung, báo động bền vững qua việc rút điện |
| Thiết bị ↔ máy chủ | HTTPS, khóa thiết bị, máy chủ chỉ lưu băm SHA-256 |
| Người dùng ↔ web | Supabase Auth (JWT), mọi API dashboard đều yêu cầu token |
| Cơ sở dữ liệu | Row Level Security: gọi trực tiếp bằng khóa công khai chỉ nhận về rỗng |
| Điều khiển từ xa | **Không có** API nào gửi lệnh mở két từ web |

### Slide 11: Phân công công việc (cả hai)

**Nguyên tắc chia:** mỗi người phụ trách một nửa hệ thống, mỗi người tự viết **một phía của giao thức** (Người 1 viết client trên ESP32, Người 2 viết server), cùng thống nhất định dạng dữ liệu, và cùng làm báo cáo, kiểm thử tích hợp, demo.

| Gói việc | Người 1 (Phần cứng và firmware) | Người 2 (Phần mềm) | Tỷ trọng |
|---|---|---|---|
| **A. Nền tảng** | Thiết kế sơ đồ đấu nối, lắp mô hình két, nguồn, servo | Thiết kế CSDL, tạo project Supabase, cấu hình Vercel | 12,5% mỗi người |
| **B. Chức năng chính** | Firmware: RFID, keypad, LCD, servo, máy trạng thái | API Express: xác thực thiết bị, nhận sự kiện, nhịp tim, đồng bộ thẻ | 12,5% mỗi người |
| **C. Bảo mật** | TOTP (HMAC-SHA1, Base32), chống dùng lại mã, giới hạn sai, lưu flash, RTC và NTP | Supabase Auth, RLS, băm khóa thiết bị, kiểm tra dữ liệu đầu vào | 12,5% mỗi người |
| **D. Cảnh báo** | Cảm biến SW-420 (ngắt, ngưỡng, hiệu chuẩn), báo động | Web dashboard realtime, thống kê, nhật ký, xuất CSV | 12,5% mỗi người |
| **E. Giao thức** | Client HTTPS trên ESP32: hàng đợi, thử lại, đồng bộ thẻ | Web Push, Telegram, PWA, giao diện điện thoại | 12,5% mỗi người |
| **Chung** | Thống nhất định dạng JSON giữa két và máy chủ; kiểm thử tích hợp; viết báo cáo phần của mình; trình bày và demo | | 50% / 50% |

> "Nhóm chia theo ranh giới tự nhiên là **thiết bị** và **dịch vụ**, mỗi bên có khối lượng tương đương: bên phần cứng nhiều việc đấu nối, hiệu chỉnh và tối ưu thời gian thực; bên phần mềm nhiều việc về kiến trúc, bảo mật và giao diện. Hai bên gặp nhau ở **giao thức**, nơi mỗi người viết một đầu và kiểm thử chéo."

### Slide 12: Demo (3 phút)

Xem mục 3 bên dưới.

### Slide 13: Hạn chế, hướng phát triển, kết luận

**Người 2:**

> "Về hạn chế, xin nói thẳng ba điểm. **Một**, két hiện kết nối HTTPS nhưng **chưa kiểm tra chứng chỉ máy chủ**, đây là cách làm cho mô hình thử nghiệm, sản phẩm thật cần ghim chứng chỉ. **Hai**, cơ cấu khóa là servo cho mô hình, chưa chịu lực như khóa thật. **Ba**, báo động tại két hiện qua LCD và đèn, **chưa có còi**, còn âm thanh chỉ phát trên web.
>
> Hướng phát triển: thêm còi báo động, pin dự phòng khi mất điện, nhiều két và nhiều người dùng với phân quyền, và camera ghi hình khi có báo động."

**Người 1 (kết luận):**

> "Tóm lại, nhóm đã xây dựng được một hệ thống két sắt hoàn chỉnh từ phần cứng đến ứng dụng điện thoại, với xác thực hai lớp, chống cạy phá, và báo động từ xa theo thời gian thực. Xin cảm ơn thầy cô và các bạn đã lắng nghe, nhóm sẵn sàng trả lời câu hỏi."

---

## 3. Kịch bản demo (3 phút)

**Chuẩn bị trước giờ báo cáo (bắt buộc):**
- [ ] Két đã cắm điện, LCD hiện giờ (đã đồng bộ NTP), web hiện **Trực tuyến**.
- [ ] Điện thoại đã cài PWA và đã bật thông báo; **tắt hẳn ứng dụng** trước khi demo phần 4.
- [ ] Laptop mở dashboard, chiếu lên màn hình; điện thoại chiếu hoặc cầm giơ lên cho cả lớp thấy.
- [ ] Google Authenticator đã có mã của két. Kiểm tra giờ điện thoại để tự động.
- [ ] Thẻ Admin và một thẻ lạ để sẵn.
- [ ] **Phương án dự phòng:** quay sẵn video demo; và `npm run simulate -- --url https://safety-box.vercel.app/api/device` để tạo sự kiện nếu két lỗi.

| # | Người thao tác | Hành động | Cho khán giả thấy |
|---|---|---|---|
| 1 | Người 1 | Quẹt **thẻ lạ** | LCD báo thẻ không hợp lệ; Người 2 chỉ vào dashboard: dòng "Quẹt thẻ lạ" **hiện ngay**, mức Cảnh báo |
| 2 | Người 1 | Quẹt **thẻ Admin**, nhập **OTP đúng** từ Authenticator | Servo mở, LCD đếm ngược 60 giây; dashboard hiện "Mở két bằng Thẻ + OTP" và két chuyển trạng thái Đang mở |
| 3 | Người 1 | Bấm **#** để đóng | Servo đóng; dashboard hiện "Đóng két" |
| 4 | Người 1 | Quẹt thẻ Admin, **nhập sai OTP 3 lần** | LED nhấp nháy; sau lần thứ 3 LCD báo **BÁO ĐỘNG**; dashboard hiện banner đỏ kèm âm thanh |
| 5 | Người 2 | Giơ điện thoại (đã tắt ứng dụng) | **Thông báo đẩy hiện trên màn hình khóa**; bấm vào thì mở đúng ứng dụng |
| 6 | Người 1 | Quẹt thẻ Admin để tắt báo động | Banner tắt; nhật ký ghi "Admin tắt báo động" |
| 7 | Người 2 | Vào **Quản lý thẻ**, thêm thẻ, **quẹt thẻ mới vào két** | Web tự nhận UID, thẻ xuất hiện trong danh sách; nói thêm: két tự đồng bộ trong tối đa 30 giây |
| 8 | Người 2 (nếu còn giờ) | Gõ mạnh vào vỏ két | Cảm biến rung báo động cạy phá |

> **Mẹo:** bước 4 và 5 là điểm nhấn nhất, nên dành thời gian cho hai bước này. Nếu hết giờ thì bỏ bước 7 và 8.

---

## 4. Câu hỏi thường gặp và cách trả lời

**1. Tại sao dùng TOTP mà không dùng mật khẩu cố định?**
Mật khẩu cố định bị lộ là mất tác dụng và không biết ai đã dùng. TOTP đổi mỗi 30 giây, mỗi mã dùng một lần, lộ mã cũ cũng vô ích. Và két với điện thoại không cần mạng để đồng bộ, chỉ cần cùng khóa và giờ.

**2. Mất mạng thì két còn hoạt động không?**
Còn. Thẻ Admin lưu trong flash, giờ lấy từ RTC, OTP tính ngay trên chip. Sự kiện xếp vào hàng đợi (tối đa 40) và gửi bù khi có mạng. Chỉ có thông báo về điện thoại là chậm lại đến khi có mạng.

**3. Nếu mất điện hoặc kẻ trộm rút điện thì sao?**
Trạng thái báo động và số lần sai lưu trong flash. Cấp điện lại két vẫn báo động tiếp. ⚠️ *Két chưa có pin dự phòng nên khi mất điện thật, két không gửi được tin; đây là hướng phát triển.*

**4. Hacker có mở két từ xa qua mạng được không?**
Không có đường đó. API chỉ cho két gửi dữ liệu lên, web chỉ xem và quản lý thẻ. Không có lệnh nào "mở két" từ web hay máy chủ.

**5. Nếu lộ khóa thiết bị hoặc khóa OTP thì sao?**
Khóa thiết bị tạo lại bằng một lệnh và máy chủ chỉ lưu bản băm. Khóa OTP tạo lại bằng script `gen_secret.py` rồi quét QR mới và nạp lại vào két.

**6. Hai người cùng đăng nhập dashboard thì sao?**
Đều thấy sự kiện realtime, vì kênh phát tin là chung cho mọi tài khoản đã đăng nhập. Đăng ký tài khoản mới bị tắt, chỉ chủ tạo tài khoản được.

**7. Vì sao chọn Supabase và Vercel?**
Miễn phí cho quy mô đồ án, có sẵn Auth, Realtime và PostgreSQL nên đỡ phải tự viết, triển khai bằng GitHub. Đổi lại phụ thuộc nhà cung cấp, nhưng mã nguồn Express và Prisma có thể chuyển sang máy chủ riêng.

**8. Có báo nhầm khi người dùng bấm phím hay servo quay không?**
Có xử lý: cảm biến bị bỏ qua 0,3 giây sau mỗi lần bấm phím và 3 giây sau khi servo quay, khi két mở thì tắt giám sát. Ngưỡng báo động dựa trên số va đập và thời gian rung nên gõ nhẹ chỉ ghi nhật ký.

**9. Điện thoại iPhone có nhận thông báo đẩy không?**
Có, từ iOS 16.4, nhưng phải cài ứng dụng lên màn hình chính trước, đó là quy định của Apple.

**10. Độ trễ từ lúc có sự kiện đến lúc thấy trên web là bao nhiêu?**
⚠️ *Điền số đo thực tế (đo bằng cách quẹt thẻ và bấm giờ đến lúc dòng mới hiện).*

**11. Vì sao két gửi HTTPS mà nói là "chưa kiểm tra chứng chỉ"?**
Nhóm bật mã hóa HTTPS nhưng bỏ bước đối chiếu chứng chỉ để đơn giản hóa mô hình thử nghiệm. Dữ liệu vẫn được mã hóa, nhưng chưa chống được tấn công giả mạo máy chủ. Sản phẩm thật sẽ ghim chứng chỉ gốc.

---

## 5. Công nghệ sử dụng (bảng tra nhanh)

| Lớp | Công nghệ |
|---|---|
| Vi điều khiển | ESP32, Arduino C++, FreeRTOS (2 lõi), bộ nhớ flash NVS |
| Ngoại vi | RC522 (SPI), LCD I2C, DS3231 (I2C), servo (PWM), SW-420 (ngắt), keypad 4x4 |
| Mật mã | TOTP RFC 6238, HMAC-SHA1, Base32 (tự cài đặt trên ESP32), SHA-256 |
| Mạng | WiFi, HTTPS, JSON, NTP |
| Backend | Node.js 22, Express 5, Prisma, Zod, Helmet |
| Hạ tầng | Vercel (serverless), Supabase (PostgreSQL, Auth, Realtime), Telegram Bot API |
| Frontend | Vue 3, Vite, PrimeVue 4, Tailwind CSS 4, Chart.js |
| PWA | Service Worker, Web App Manifest, Web Push (VAPID) |

## 6. Trước khi báo cáo, hãy kiểm tra

- [ ] Sửa "Người 1/Người 2" thành tên thật và **sửa bảng phân công cho đúng việc mỗi người thực sự làm**; hội đồng sẽ hỏi từng người.
- [ ] Điền các số đo ⚠️ (độ trễ realtime).
- [ ] Cả hai đều phải hiểu phần của người kia ở mức tóm tắt (đặc biệt slide 6), vì câu hỏi có thể hỏi chéo.
- [ ] Xác nhận demo chạy trọn vẹn ít nhất 2 lần trước giờ báo cáo.
