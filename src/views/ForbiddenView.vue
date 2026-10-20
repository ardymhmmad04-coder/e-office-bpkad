<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <h1 class="text-2xl font-semibold">Anda tidak memiliki akses ke halaman ini</h1>
  <p class="mt-3 max-w-prose leading-relaxed text-redup">
    Hak akses akun Anda belum mencakup modul tersebut. Jika Anda merasa seharusnya bisa mengaksesnya,
    minta administrator menambahkan hak akses.
  </p>
  <RouterLink
    :to="{ name: 'dashboard' }"
    class="mt-6 inline-block rounded-md bg-barito-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-barito-800"
  >
    Kembali ke dashboard
  </RouterLink>
</template>
