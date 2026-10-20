<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { pesanError } from '@/lib/errors'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const memproses = ref(false)
const galat = ref('')

// Hanya izinkan tujuan di dalam aplikasi ini (hindari open redirect).
function tujuanAman() {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/'
}

async function masuk() {
  galat.value = ''
  if (!email.value.trim() || !password.value) {
    galat.value = 'Isi email dan kata sandi.'
    return
  }
  memproses.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    await router.replace(tujuanAman())
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    memproses.value = false // selalu dikembalikan, tombol tidak boleh macet
  }
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-2xl font-semibold">Masuk</h1>
    <p class="mt-1 text-sm text-redup">Gunakan akun yang diberikan administrator.</p>

    <form class="mt-8 space-y-5" novalidate @submit.prevent="masuk">
      <div>
        <label for="email" class="block text-sm font-medium">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="username"
          required
          class="mt-1.5 w-full rounded-md border border-garis bg-white px-3 py-2.5 text-sm placeholder:text-redup/70"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium">Kata sandi</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="mt-1.5 w-full rounded-md border border-garis bg-white px-3 py-2.5 text-sm"
        />
      </div>

      <p v-if="galat" role="alert" class="rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ galat }}</p>

      <button
        type="submit"
        class="w-full rounded-md bg-barito-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60"
        :disabled="memproses"
      >
        {{ memproses ? 'Memverifikasi...' : 'Masuk' }}
      </button>
    </form>

    <p class="mt-6 text-sm text-redup">Lupa kata sandi? Hubungi administrator sistem.</p>
  </AuthLayout>
</template>
