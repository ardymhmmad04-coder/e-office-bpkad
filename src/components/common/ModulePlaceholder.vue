<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { labelModul, labelScope } from '@/config/menu'

const route = useRoute()
const permission = usePermissionStore()

const meta = computed(() => route.meta)
const cakupan = computed(() => labelScope[permission.scopeOf(meta.value.modul, 'VIEW')] ?? '-')
</script>

<template>
  <h1 class="text-2xl font-semibold">{{ meta.judul }}</h1>
  <p class="mt-3 max-w-prose leading-relaxed text-redup">{{ meta.deskripsi }}</p>

  <dl class="mt-6 max-w-md divide-y divide-garis rounded-lg border border-garis bg-white text-sm">
    <div class="flex justify-between gap-4 px-4 py-3">
      <dt class="text-redup">Status</dt>
      <dd>Belum dibangun</dd>
    </div>
    <div class="flex justify-between gap-4 px-4 py-3">
      <dt class="text-redup">Roadmap</dt>
      <dd>{{ meta.tahap ? `Tahap ${meta.tahap}` : 'Belum dijadwalkan' }}</dd>
    </div>
    <div class="flex justify-between gap-4 px-4 py-3">
      <dt class="text-redup">Hak akses modul</dt>
      <dd>{{ labelModul[meta.modul] ?? meta.modul }}</dd>
    </div>
    <div class="flex justify-between gap-4 px-4 py-3">
      <dt class="text-redup">Cakupan data Anda</dt>
      <dd>{{ cakupan }}</dd>
    </div>
  </dl>
</template>
