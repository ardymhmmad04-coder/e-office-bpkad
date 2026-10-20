<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { pesanError } from '@/lib/errors'

defineEmits(['buka-menu'])

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const sedangKeluar = ref(false)
const galatKeluar = ref('')

async function keluar() {
  sedangKeluar.value = true
  galatKeluar.value = ''
  try {
    await auth.logout()
    await router.replace({ name: 'login' })
  } catch (err) {
    console.error(err)
    galatKeluar.value = pesanError(err)
  } finally {
    sedangKeluar.value = false
  }
}
</script>

<template>
  <header class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-garis bg-white px-4 sm:px-6 lg:px-8">
    <button
      type="button"
      class="-ml-2 rounded p-2 text-ink hover:bg-mist lg:hidden"
      aria-label="Buka menu"
      @click="$emit('buka-menu')"
    >
      <Menu :size="22" />
    </button>

    <p class="min-w-0 flex-1 truncate text-base font-semibold">{{ route.meta.judul }}</p>

    <span v-if="galatKeluar" role="alert" class="text-xs text-bahaya">{{ galatKeluar }}</span>

    <div class="min-w-0 max-w-[10rem] text-right leading-tight sm:max-w-[16rem]">
      <p class="truncate text-sm font-medium">{{ auth.profile?.nama }}</p>
      <p class="truncate text-xs text-redup">{{ auth.profile?.jabatan || auth.profile?.unit_kerja?.nama }}</p>
    </div>

    <button
      type="button"
      class="flex items-center gap-1.5 rounded-md border border-garis px-3 py-1.5 text-sm hover:bg-mist disabled:opacity-60"
      :disabled="sedangKeluar"
      @click="keluar"
    >
      <LogOut :size="16" />
      <span>Keluar</span>
    </button>
  </header>
</template>
