<script setup>
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login } from '../lib/auth.js';

const route = useRoute();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await login(email.value, password.value);
    const redirect = String(route.query.redirect || '/');
    router.replace(redirect.startsWith('/') ? redirect : '/');
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-sm border border-slate-200">
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <i class="pi pi-shield text-indigo-600 text-xl" />
              <h1 class="m-0 text-xl font-semibold text-slate-900">Đăng nhập hệ thống</h1>
            </div>
            <p class="m-0 text-xs text-slate-500">Quản lý két sắt thông minh: trạng thái, nhật ký và thẻ Admin.</p>
          </div>

          <Message v-if="error" severity="error" size="small">{{ error }}</Message>

          <div class="flex flex-col gap-2">
            <label for="email" class="text-sm font-medium text-slate-700">Email</label>
            <InputText id="email" v-model="email" type="email" autocomplete="username" required autofocus fluid />
          </div>
          <div class="flex flex-col gap-2">
            <label for="password" class="text-sm font-medium text-slate-700">Mật khẩu</label>
            <Password
              v-model="password"
              input-id="password"
              :feedback="false"
              toggle-mask
              autocomplete="current-password"
              required
              fluid
            />
          </div>
          <Button type="submit" label="Đăng nhập" icon="pi pi-sign-in" :loading="loading" fluid />
        </form>
      </template>
    </Card>
  </div>
</template>
