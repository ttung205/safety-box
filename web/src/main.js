import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { createApp } from 'vue';
import App from './App.vue';
import { viLocale } from './lib/locale.js';
import { router } from './router.js';
import { KetSatPreset } from './theme.js';
import './style.css';

createApp(App)
  .use(PrimeVue, {
    locale: viLocale,
    theme: {
      preset: KetSatPreset,
      options: {
        darkModeSelector: '.app-dark', // luôn dùng nền sáng (Clean Canvas)
        cssLayer: { name: 'primevue', order: 'theme, base, primevue' },
      },
    },
  })
  .use(ToastService)
  .use(ConfirmationService)
  .use(router)
  .mount('#app');
