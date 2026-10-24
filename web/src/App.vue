<script setup>
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { isMobile } from './lib/breakpoint.js';
</script>

<template>
  <div class="min-h-dvh bg-slate-50 text-slate-900">
    <Toast :position="isMobile ? 'top-center' : 'bottom-right'" :breakpoints="{ '767px': { width: '92vw' } }" />
    <ConfirmDialog :breakpoints="{ '767px': '92vw' }" />
    <RouterView />
  </div>
</template>
