import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Khi dev: Vite (cổng 5173) chuyển các API sang Express ở cổng 3000.
const target = 'http://localhost:3000';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/api': target,
      '/dash-api': target,
    },
  },
});
