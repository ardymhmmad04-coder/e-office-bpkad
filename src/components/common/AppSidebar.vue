<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { X } from 'lucide-vue-next'
import { menu } from '@/config/menu'
import { usePermissionStore } from '@/stores/permission'
import RipplePattern from './RipplePattern.vue'

defineProps({ terbuka: { type: Boolean, default: false } })
defineEmits(['tutup'])

const permission = usePermissionStore()

// Hanya tampilkan item yang boleh dilihat pengguna; grup kosong ikut disembunyikan.
const grupTampil = computed(() =>
  menu
    .map((grup) => ({ ...grup, item: grup.item.filter((i) => permission.can(i.modul, 'VIEW')) }))
    .filter((grup) => grup.item.length > 0)
)
</script>

<template>
  <div
    v-if="terbuka"
    class="fixed inset-0 z-30 bg-ink/50 lg:hidden"
    aria-hidden="true"
    @click="$emit('tutup')"
  ></div>

  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-barito-900 text-white transition-transform duration-200 lg:translate-x-0',
      terbuka ? 'translate-x-0' : '-translate-x-full',
    ]"
    aria-label="Menu utama"
  >
    <div class="relative h-28 shrink-0 overflow-hidden">
      <RipplePattern />
      <div class="relative flex h-full flex-col justify-end p-5">
        <p class="text-lg font-semibold leading-tight">E-Office BPKAD</p>
        <p class="mt-0.5 text-xs text-barito-200">Provinsi Kalimantan Selatan</p>
      </div>
      <button
        type="button"
        class="absolute right-3 top-3 rounded p-1.5 text-barito-200 hover:bg-barito-800 lg:hidden"
        aria-label="Tutup menu"
        @click="$emit('tutup')"
      >
        <X :size="20" />
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 pb-6 pt-2" aria-label="Navigasi modul">
      <div v-for="grup in grupTampil" :key="grup.judul" class="mt-5 first:mt-2">
        <p class="px-3 pb-1 text-xs font-medium text-barito-300">{{ grup.judul }}</p>
        <ul class="space-y-0.5">
          <li v-for="item in grup.item" :key="item.to">
            <RouterLink :to="item.to" custom v-slot="{ href, navigate, isActive, isExactActive }">
              <a
                :href="href"
                :aria-current="(item.tepat ? isExactActive : isActive) ? 'page' : undefined"
                :class="[
                  'flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm transition-colors',
                  (item.tepat ? isExactActive : isActive)
                    ? 'border-emas bg-barito-800 font-medium text-white'
                    : 'border-transparent text-barito-100 hover:bg-barito-800/60',
                ]"
                @click="(e) => { navigate(e); $emit('tutup') }"
              >
                <component :is="item.ikon" :size="18" class="shrink-0" />
                <span>{{ item.label }}</span>
              </a>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>
  </aside>
</template>
