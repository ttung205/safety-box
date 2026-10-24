import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Khi dev: Vite (cổng 5173) chuyển các API sang Express ở cổng 3000.
const target = 'http://localhost:3000';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      // Tự viết Service Worker (src/sw.js) vì cần xử lý Web Push.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png', 'icons/badge-96.png'],
      injectManifest: {
        // Chỉ lưu vỏ ứng dụng; dữ liệu két luôn lấy mới từ API.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: {
        id: '/',
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
      },
    }),
  ],
  server: {
    proxy: {
      '/api': target,
      '/dash-api': target,
    },
  },
});
