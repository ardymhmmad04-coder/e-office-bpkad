<script setup>
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppTopbar from '@/components/common/AppTopbar.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const menuTerbuka = ref(false)

watch(() => route.fullPath, () => {
  menuTerbuka.value = false
})
</script>

<template>
  <div class="min-h-screen">
    <AppSidebar :terbuka="menuTerbuka" @tutup="menuTerbuka = false" />

    <div class="lg:pl-64">
      <AppTopbar @buka-menu="menuTerbuka = true" />

      <div
        v-if="auth.loadError"
        role="alert"
        class="flex flex-wrap items-center gap-3 border-b border-bahaya/30 bg-bahaya-muda px-4 py-3 text-sm text-bahaya sm:px-6 lg:px-8"
      >
        <span>Gagal memuat data akun: {{ auth.loadError }}</span>
        <button type="button" class="rounded border border-bahaya/40 px-2.5 py-1 hover:bg-white" @click="auth.muatProfil()">
          Coba lagi
        </button>
      </div>

      <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
