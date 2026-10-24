import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// Chỉ lưu vỏ ứng dụng (JS, CSS, icon). API và Supabase không bao giờ được cache để không hiện trạng thái két cũ.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, /^\/dash-api\//],
  }),
);

// Bản mới chỉ được kích hoạt khi người dùng bấm "Cập nhật" trong app.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ---- Web Push: server gửi { title, body, tag, severity, url } ----
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  const critical = data.severity === 'critical';
  // Trình duyệt (đặc biệt Safari) yêu cầu mỗi push phải hiện một thông báo.
  event.waitUntil(
    self.registration.showNotification(data.title || 'Két sắt thông minh', {
      body: data.body || '',
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      vibrate: critical ? [400, 150, 400, 150, 400] : [200],
      requireInteraction: critical,
      timestamp: Date.now(),
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.focus();
      return self.clients.openWindow(url);
    })(),
  );
});
