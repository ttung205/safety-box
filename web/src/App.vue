<script setup>
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <Toast position="bottom-right" />
    <ConfirmDialog />
    <RouterView />
  </div>
</template>
