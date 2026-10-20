<script setup>
// Riak sungai: lingkaran konsentris dari sudut kiri bawah. Satu lingkaran
// berwarna emas menjadi satu-satunya aksen pada panel merek.
const jari = Array.from({ length: 12 }, (_, i) => 90 + i * 90)
const JARI_EMAS = 450
</script>

<template>
  <svg
    class="pointer-events-none absolute inset-0 h-full w-full"
    viewBox="0 0 800 800"
    preserveAspectRatio="xMinYMax slice"
    aria-hidden="true"
  >
    <g fill="none" stroke-width="1.5">
      <circle
        v-for="r in jari"
        :key="r"
        cx="0"
        cy="800"
        :r="r"
        :stroke="r === JARI_EMAS ? 'var(--color-emas)' : 'var(--color-barito-500)'"
        :stroke-opacity="r === JARI_EMAS ? 0.85 : 0.35"
      />
    </g>
  </svg>
</template>
