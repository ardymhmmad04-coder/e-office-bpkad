<script setup>
import RipplePattern from '@/components/common/RipplePattern.vue'
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
    <section class="relative min-h-56 overflow-hidden bg-barito-900 px-8 py-10 text-white lg:px-14 lg:py-16">
      <RipplePattern />
      <div class="relative flex h-full flex-col justify-end">
        <div class="max-w-md">
          <p class="text-3xl font-semibold leading-tight lg:text-4xl">E-Office BPKAD</p>
          <p class="mt-3 leading-relaxed text-barito-100">
            Portal internal ASN Badan Pengelolaan Keuangan dan Aset Daerah Provinsi Kalimantan Selatan.
          </p>
        </div>
      </div>
    </section>

    <section class="flex items-center justify-center bg-white px-6 py-12">
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </section>
  </div>
</template>
