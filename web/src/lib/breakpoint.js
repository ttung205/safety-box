import { ref } from 'vue';

// Khớp breakpoint `md` của Tailwind (768px): dưới mức này là điện thoại.
const query = window.matchMedia('(max-width: 767px)');

export const isMobile = ref(query.matches);
query.addEventListener('change', (e) => (isMobile.value = e.matches));
