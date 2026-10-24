import { createRouter, createWebHistory } from 'vue-router';
import { auth, fetchMe } from './lib/auth.js';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./pages/LoginPage.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('./components/AppLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('./pages/DashboardPage.vue'), meta: { title: 'Tổng quan' } },
        { path: 'cards', name: 'cards', component: () => import('./pages/CardsPage.vue'), meta: { title: 'Quản lý thẻ' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

// Chưa đăng nhập thì chuyển về trang đăng nhập.
router.beforeEach(async (to) => {
  if (!auth.user) await fetchMe().catch(() => {});
  if (to.meta.public) return auth.user && to.name === 'login' ? { path: '/' } : true;
  return auth.user ? true : { name: 'login', query: { redirect: to.fullPath } };
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Két sắt thông minh` : 'Két sắt thông minh';
});
