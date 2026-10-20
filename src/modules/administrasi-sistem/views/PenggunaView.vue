<script setup>
import { ref } from 'vue'
import PenggunaTab from '../components/PenggunaTab.vue'
import RoleTab from '../components/RoleTab.vue'

const tab = ref('pengguna')
const tabs = [
  { id: 'pengguna', label: 'Pengguna' },
  { id: 'role', label: 'Role dan hak akses' },
]
</script>

<template>
  <h1 class="text-2xl font-semibold">Pengguna dan hak akses</h1>
  <p class="mt-2 max-w-prose text-sm leading-relaxed text-redup">
    Akun baru dibuat di Supabase (Authentication > Users). Setelah akunnya ada, atur unit kerja, role, dan hak
    tambahannya di sini. Akun baru otomatis berstatus role Pegawai.
  </p>

  <div class="mt-6 flex gap-1 border-b border-garis" role="tablist" aria-label="Bagian pengaturan">
    <button
      v-for="t in tabs"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="tab === t.id"
      :class="[
        '-mb-px border-b-2 px-4 py-2.5 text-sm',
        tab === t.id ? 'border-barito-700 font-semibold text-barito-800' : 'border-transparent text-redup hover:text-ink',
      ]"
      @click="tab = t.id"
    >
      {{ t.label }}
    </button>
  </div>

  <div class="mt-6">
    <PenggunaTab v-if="tab === 'pengguna'" />
    <RoleTab v-else />
  </div>
</template>
