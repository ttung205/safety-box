# Plan: giao diện responsive + PWA cho điện thoại

## Mục tiêu

- Dùng thoải mái trên điện thoại (màn hình rộng 360–430px), máy tính bảng và máy tính.
- Cài được lên màn hình chính như một app (Android Chrome, iOS Safari 16.4+), mở lên không có thanh địa chỉ.
- **Báo động phải đến được điện thoại kể cả khi đã đóng app**, qua Web Push.
- Vẫn tuân thủ `.agent/rules/ui-guidelines.md`: chỉ dùng PrimeVue + Tailwind, bo góc 6px, không gradient, không blur, không đổ bóng, không lồng Card trong Card.

## Phụ thuộc vào plan Supabase/Vercel

Plan này làm **sau** [PLAN-supabase-vercel.md](PLAN-supabase-vercel.md), vì:
- PWA và Service Worker bắt buộc chạy trên HTTPS, tức là cần Vercel.
- Web Push cần bảng lưu đăng ký nhận thông báo (subscription) trên Supabase và route trên server.
- Sau khi chuyển sang Bearer token, nút "Xuất file CSV" (hiện đang dùng `window.location.href`) không còn gửi kèm token được. Phần sửa nút này nằm ở Bước 3 của plan này.
- `lib/store.js` đang gọi thẳng `socket.on(...)`. Phần này phải được xử lý khi viết lại realtime ở plan Supabase.

## Hiện trạng trên điện thoại

| Chỗ | Vấn đề |
|---|---|
| `AppLayout.vue` header | Logo, 2 nút điều hướng, nút "Bật thông báo" và nút "Đăng xuất" xếp chung một hàng 56px nên bị chật hoặc tràn. Lề `px-6` quá rộng cho màn hình nhỏ. |
| `main p-6` | Mất 48px chiều ngang trên màn hình 360px. |
| `EventTable.vue` | 6 bộ lọc cố định chiều rộng (`w-56`, `w-60`…) nên rớt thành nhiều dòng. Bảng 6 cột phải cuộn ngang. |
| `CardsPage.vue` | Bảng 4 cột, các nút "Đổi tên"/"Xóa" có chữ nên bị tràn. |
| `size="small"` cho Input/Select | Chữ 14px nên **iOS tự phóng to trang khi chạm vào ô nhập**. Nút nhỏ (~32px) cũng khó bấm. |
| `Toast position="bottom-right"` | Trên điện thoại sẽ đè lên thanh điều hướng dưới (sẽ thêm ở Bước 2). |
| `new Notification(...)` | **Không chạy trên Android Chrome** (bắt buộc dùng `registration.showNotification`). Ngoài ra chỉ báo được khi tab còn mở. |
| `AlarmBanner` phát tiếng bíp bằng AudioContext | Trên điện thoại, trình duyệt chỉ cho phát âm thanh sau khi người dùng đã chạm vào trang. |
| `min-h-screen` | Trên iOS bị lệch chiều cao do thanh địa chỉ co giãn. |

---

## Bước 1: Nền tảng responsive

- [ ] `index.html`:
  - viewport: `width=device-width, initial-scale=1, viewport-fit=cover`
  - thêm `<meta name="theme-color" content="#ffffff">`
- [ ] Tạo `lib/breakpoint.js`: dùng `matchMedia('(max-width: 767px)')` để export ref `isMobile`, dùng ở những chỗ phải đổi component theo màn hình chứ không chỉ đổi class (bảng thành danh sách, vị trí Toast, Dialog).
- [ ] Quy ước kích thước theo màn hình:
  - Lề trang: `px-4 md:px-6`, khoảng cách giữa các khối: `gap-4 md:gap-6`.
  - Trên điện thoại **không dùng `size="small"`** cho Input/Select/DatePicker, để chữ 16px và iOS không tự phóng to. Truyền `:size="isMobile ? undefined : 'small'"`.
  - Vùng bấm tối thiểu 44px trên điện thoại.
- [ ] Đổi `min-h-screen` thành `min-h-dvh` ở `App.vue`, `AppLayout.vue`, `LoginPage.vue`.
- [ ] Vùng an toàn cho tai thỏ và thanh home trên iOS: thêm vào `style.css` các utility
      `pt-[env(safe-area-inset-top)]` / `pb-[env(safe-area-inset-bottom)]`. Đây là giá trị tùy biến của Tailwind nên không vi phạm quy định "chỉ dùng Tailwind".

## Bước 2: Khung ứng dụng (`AppLayout.vue`, `App.vue`)

**Điện thoại (< md):**
- [ ] Header 56px chỉ gồm: logo `pi-shield`, tiêu đề trang hiện tại (lấy từ `route.meta.title`), chấm trạng thái kết nối, và nút `pi pi-ellipsis-v` mở `<Menu popup>`. Menu này chứa: tên người dùng, "Bật thông báo", "Cài ứng dụng", "Đăng xuất".
- [ ] **Thanh điều hướng dưới** cố định đáy màn hình: `fixed bottom-0 inset-x-0 bg-white border-t border-slate-200`, cộng thêm khoảng vùng an toàn phía dưới. Gồm 2 mục "Tổng quan" và "Quản lý thẻ", mỗi mục là icon + chữ nhỏ (`<Button text>` xếp dọc), mục đang mở có màu indigo.
- [ ] `main` thêm `pb-20` để nội dung không bị thanh dưới che.

**Máy tính (≥ md):** giữ header như hiện tại, chỉ đổi lề thành `px-6`.

**Toast và báo động:**
- [ ] Toast: trên điện thoại hiện ở `top-center` và rộng hết màn hình (`:breakpoints="{ '767px': { width: 'calc(100vw - 32px)' } }"`). Trên máy tính giữ `bottom-right`.
- [ ] `AlarmBanner`: lề `px-4 md:px-6`, `top-14` vẫn đúng. Nút tắt/bật âm thanh trên điện thoại chỉ hiện icon.

## Bước 3: Từng màn hình

### Tổng quan (`DashboardPage.vue`)
- [ ] Trên điện thoại ẩn dòng mô tả dưới tiêu đề trang (header đã hiện tiêu đề).
- [ ] 3 ô thống kê: `grid grid-cols-3 gap-2 md:gap-4`. Trên điện thoại số hiển thị `text-2xl`, ẩn dòng ghi chú (`hidden md:block`), nhãn rút gọn thành "Báo động" / "Cảnh báo" / "Thông thường".
- [ ] `DeviceCard`: giữ lưới `dl` 2 cột. Trên điện thoại ẩn "Địa chỉ IP" và "Bộ nhớ trống" sau một nút "Xem chi tiết" (dùng `v-show`).
- [ ] `AlertsChart`: chiều cao `h-56 md:h-72`. Trục X dùng `ticks.autoSkip` + `maxRotation: 0`. Trên điện thoại chỉ hiển thị 7 ngày.

### Nhật ký sự kiện (`EventTable.vue`)
- [ ] **Bộ lọc trên điện thoại:** chỉ hiện một hàng gồm nút "Bộ lọc" (kèm `<Badge>` số bộ lọc đang bật) và nút "Xuất CSV". Bấm "Bộ lọc" mở `<Drawer position="bottom">` chứa đủ các bộ lọc, mỗi bộ lọc rộng hết màn hình (`fluid`), cuối Drawer có 2 nút "Đặt lại bộ lọc" và "Áp dụng".
- [ ] **Danh sách trên điện thoại:** thay `DataTable` bằng `<DataView>` (vẫn là component PrimeVue). Mỗi dòng gồm:
  - dòng 1: `Tag` mức độ, tên sự kiện in đậm, thời gian (`text-xs`, căn phải)
  - dòng 2: nội dung sự kiện
  - dòng 3: chi tiết `describeMeta` (`text-xs text-slate-500`) và tên két nếu có nhiều két
  - Các dòng phân cách bằng `border-b border-slate-200`. Dòng mới hoặc dòng nghiêm trọng giữ màu nền như `rowClass` hiện tại.
- [ ] Phân trang trên điện thoại: `template="PrevPageLink CurrentPageReport NextPageLink"`.
- [ ] **Xuất CSV** (bắt buộc sửa sau khi chuyển sang Bearer token): dùng `fetch` có header Authorization để lấy `Blob`. Trên điện thoại nếu `navigator.canShare({ files })` thì mở `navigator.share` (lưu vào Files/Drive). Còn lại thì tạo thẻ `<a download>` từ `URL.createObjectURL`.

### Quản lý thẻ (`CardsPage.vue`)
- [ ] Hàng công cụ: Select chọn két rộng hết màn hình (`w-full md:w-52`). Nút "Thêm thẻ mới" trên điện thoại rộng hết màn hình và nằm dưới Select.
- [ ] Danh sách thẻ trên điện thoại dùng `DataView`. Mỗi dòng gồm tên chủ thẻ, UID (`font-mono text-xs`), ngày thêm, và nút `pi pi-ellipsis-v` mở `<Menu popup>` với 2 lựa chọn "Đổi tên" / "Xóa".
- [ ] "Thẻ lạ quẹt gần đây": trên điện thoại nút "Cấp quyền" nằm dưới UID và rộng hết dòng.
- [ ] Dialog thêm/sửa thẻ: `:breakpoints="{ '767px': '100vw' }"` và `position="bottom"` trên điện thoại. Bỏ `autofocus` ở ô tên trên điện thoại để bàn phím không tự bật lên che form.
- [ ] `ConfirmDialog` xóa thẻ: thêm `breakpoints` như Dialog trên.

### Đăng nhập (`LoginPage.vue`)
- [ ] Đã ổn về bố cục. Chỉ cần: `min-h-dvh`, bỏ `autofocus` trên điện thoại, ô email thêm `inputmode="email"`.

## Bước 4: Cấu hình PWA

- [ ] Cài `vite-plugin-pwa` với chiến lược `injectManifest`, vì cần tự viết code Service Worker để xử lý push.
- [ ] Manifest (khai báo trong `vite.config.js`):
  ```js
  manifest: {
    name: 'Két sắt thông minh',
    short_name: 'Két sắt',
    description: 'Theo dõi trạng thái, báo động và quản lý thẻ két sắt.',
    lang: 'vi',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  ```
- [ ] Icon: chiếc khiên màu indigo-600 trên nền trắng, nền đặc không gradient. Đặt trong `web/public/icons/`.
      Cần đủ: 192, 512, maskable 512 (chừa lề an toàn 20%), `apple-touch-icon-180.png` và `favicon.svg`.
      Có thể tạo nhanh bằng `@vite-pwa/assets-generator` từ một file SVG gốc.
- [ ] Thêm vào `index.html` cho iOS:
  `<link rel="apple-touch-icon">`, `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default">`, `<meta name="apple-mobile-web-app-title" content="Két sắt">`.
- [ ] Service Worker (`web/src/sw.js`):
  - Precache phần vỏ ứng dụng (JS, CSS, font, icon) bằng `precacheAndRoute(self.__WB_MANIFEST)`.
  - Mọi request điều hướng trang trả về `index.html` từ cache, **trừ** `/api/*` và `/dash-api/*`.
  - **Không cache API** (`/dash-api`, `/api`, `*.supabase.co`). Dữ liệu két phải luôn là dữ liệu mới nhất, không được hiển thị trạng thái cũ.
  - Xử lý `push` và `notificationclick` (xem Bước 5).
- [ ] Khi có bản cập nhật: dùng `registerType: 'prompt'` và `useRegisterSW()` từ `virtual:pwa-register/vue`. Khi có bản mới, hiện Toast "Đã có phiên bản mới" kèm nút "Cập nhật" để gọi `updateServiceWorker()`.
- [ ] **Mất mạng:** lắng nghe `online`/`offline`, hiện `<Message severity="warn">` cố định dưới header: "Mất kết nối mạng. Dữ liệu sẽ tự cập nhật khi có mạng trở lại." Khi có mạng trở lại thì gọi các resync handler.
- [ ] **Nút cài ứng dụng** (nằm trong Menu ở header):
  - Android/Chrome: bắt sự kiện `beforeinstallprompt`, lưu lại rồi gọi `prompt()` khi người dùng bấm nút.
  - iOS (không có sự kiện trên): mở Dialog hướng dẫn "Bấm nút Chia sẻ, chọn 'Thêm vào MH chính'".
  - Ẩn nút khi đã chạy dạng app (`matchMedia('(display-mode: standalone)')`).
- [ ] Vercel: đặt `Cache-Control: no-cache` cho `/sw.js` và `/manifest.webmanifest` trong `vercel.json` để cập nhật có hiệu lực ngay.

## Bước 5: Web Push khi có báo động

Nếu không có Web Push, điện thoại chỉ nhận cảnh báo khi app đang mở. Với két sắt, đây là tính năng chính nên cần làm.

**Database (migration Prisma):**
- [ ] Thêm bảng `push_subscriptions` gồm: `id`, `user_id` (uuid, lấy từ `auth.users`), `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`. Bật RLS giống các bảng khác.

**Server:**
- [ ] Cài thư viện `web-push` và tạo khóa VAPID (`npx web-push generate-vapid-keys`).
      Thêm env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:...`, và `VITE_VAPID_PUBLIC_KEY` cho web.
- [ ] Thêm route `POST /dash-api/push/subscribe` (upsert theo `endpoint`) và `DELETE /dash-api/push/subscribe`.
- [ ] Tạo `services/push.js` với hàm `notifyPush(events)`:
  - Chỉ gửi các sự kiện có mức độ nằm trong `PUSH_SEVERITIES` (mặc định `critical,warning`).
  - Gửi tới tất cả subscription đã lưu.
  - Nếu nhận lỗi 404/410 thì xóa subscription đó.
  - Gọi hàm này bằng `waitUntil` cùng chỗ với `notifyEvents` của Telegram trong `routes/device.js`.
- [ ] Nội dung push:
  `{ title: 'Báo động · Két sắt 01', body: message, tag: 'alarm-<deviceId>', url: '/', severity }`.

**Service Worker:**
- [ ] Sự kiện `push`: gọi `showNotification(title, { body, tag, icon, badge, requireInteraction: severity === 'critical', vibrate: [300, 100, 300] })`.
- [ ] Sự kiện `notificationclick`: nếu app đang mở thì đưa cửa sổ đó lên trước, nếu chưa thì mở `url`.

**Web:**
- [ ] Nút "Bật thông báo": xin quyền rồi gọi `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, sau đó gửi subscription lên server.
  - **iOS chỉ cho phép xin quyền thông báo khi app đã được cài lên màn hình chính.** Nếu đang mở trong Safari thì hiện hướng dẫn cài trước.
- [ ] Bỏ đoạn `new Notification(...)` trong `AppLayout.vue`. Khi app đang mở, chỉ hiện Toast như hiện tại. Khi đóng app, Web Push sẽ lo.
- [ ] Đăng xuất thì hủy subscription và xóa bản ghi trên server.
- [ ] Âm thanh báo động: lần chạm đầu tiên vào trang thì "mở khóa" `AudioContext` (gọi `resume()` trong listener `pointerdown` chỉ chạy 1 lần), để khi có báo động thì tiếng bíp phát được ngay.

## Bước 6: Kiểm thử

Thiết bị và độ rộng màn hình: 360 (Android nhỏ), 390 (iPhone), 768 (tablet), 1280 (laptop). Kiểm tra bằng DevTools device mode, sau đó thử trên **máy thật**.

- [ ] Không có thanh cuộn ngang ở bất kỳ độ rộng nào.
- [ ] Chạm vào ô nhập trên iPhone không làm trang phóng to.
- [ ] Thanh điều hướng dưới không bị thanh home của iPhone che. Header không bị tai thỏ che khi chạy dạng app.
- [ ] Bộ lọc trong Drawer hoạt động. Danh sách sự kiện có dòng mới chèn lên đầu realtime.
- [ ] Thêm, đổi tên, xóa thẻ được trên điện thoại.
- [ ] DevTools → Application: Manifest không có lỗi, Service Worker đã kích hoạt.
- [ ] Cài được app trên Android (Chrome) và iOS (Safari, Thêm vào MH chính). Mở lên không có thanh địa chỉ, đúng icon và tên.
- [ ] Tắt mạng: vỏ app vẫn mở được và hiện banner mất mạng. Bật mạng lại thì dữ liệu tự cập nhật.
- [ ] Deploy bản mới: app hiện Toast "Đã có phiên bản mới", bấm "Cập nhật" thì app tải lại bản mới.
- [ ] **Đóng hẳn app, chạy `simulate` kịch bản cạy phá: điện thoại hiện thông báo báo động.** Bấm vào thông báo thì mở đúng app.
- [ ] Đăng xuất xong thì không còn nhận push.
- [ ] Rà lại checklist ở mục 7 của `.agent/rules/ui-guidelines.md`.
