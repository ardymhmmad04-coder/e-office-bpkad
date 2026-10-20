<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="mx-auto max-w-xl px-6 py-24">
    <h1 class="text-2xl font-semibold">Halaman tidak ditemukan</h1>
    <p class="mt-3 leading-relaxed text-redup">Alamat yang Anda buka tidak ada. Periksa kembali alamatnya atau kembali ke beranda.</p>
    <RouterLink to="/" class="mt-6 inline-block rounded-md bg-barito-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-barito-800">
      Ke beranda
    </RouterLink>
  </main>
</template>
