<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AlokasiCutiTab from '../components/AlokasiCutiTab.vue'
import LiburTab from '../components/LiburTab.vue'
import AturanCutiTab from '../components/AturanCutiTab.vue'

const tab = ref('alokasi')
const tabs = [
  { id: 'alokasi', label: 'Alokasi cuti' },
  { id: 'libur', label: 'Hari libur' },
  { id: 'aturan', label: 'Aturan umum dan jenis cuti' },
]
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">Pengaturan cuti</h1>
      <p class="mt-2 max-w-prose text-sm leading-relaxed text-redup">
        Alokasi cuti tahunan per pegawai, daftar hari libur untuk perhitungan hari kerja, serta aturan dan jenis cuti.
      </p>
    </div>
    <RouterLink :to="{ name: 'cuti' }" class="rounded-md border border-garis bg-white px-4 py-2 text-sm hover:bg-mist">Kembali ke daftar cuti</RouterLink>
  </div>

  <div class="mt-6 flex flex-wrap gap-1 border-b border-garis" role="tablist" aria-label="Bagian pengaturan cuti">
    <button
      v-for="t in tabs"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="tab === t.id"
      :class="['-mb-px border-b-2 px-4 py-2.5 text-sm', tab === t.id ? 'border-barito-700 font-semibold text-barito-800' : 'border-transparent text-redup hover:text-ink']"
      @click="tab = t.id"
    >
      {{ t.label }}
    </button>
  </div>

  <div class="mt-6">
    <AlokasiCutiTab v-if="tab === 'alokasi'" />
    <LiburTab v-else-if="tab === 'libur'" />
    <AturanCutiTab v-else />
  </div>
</template>
