<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { labelModul, labelAksi, labelScope } from '@/config/menu'

const auth = useAuthStore()
const permission = usePermissionStore()

const peran = ref([])
const galat = ref('')

onMounted(async () => {
  const uid = auth.profile?.id
  if (!uid) return
  const { data, error } = await supabase.from('user_roles').select('roles(nama)').eq('user_id', uid)
  if (error) {
    console.error(error)
    galat.value = pesanError(error)
    return
  }
  peran.value = (data ?? []).map((r) => r.roles?.nama).filter(Boolean)
})

const URUTAN_SCOPE = ['sendiri', 'unit_kerja', 'seluruh']

// Ringkasan hak akses per modul, dikelompokkan menurut cakupan datanya.
const ringkasan = computed(() => {
  const peta = new Map()
  for (const p of permission.daftar) {
    if (!peta.has(p.modul)) peta.set(p.modul, {})
    const perScope = peta.get(p.modul)
    ;(perScope[p.data_scope] ??= []).push(labelAksi[p.aksi] ?? p.aksi)
  }
  return [...peta]
    .map(([modul, perScope]) => ({
      modul,
      label: labelModul[modul] ?? modul,
      baris: URUTAN_SCOPE.filter((s) => perScope[s]).map((s) => ({
        scope: labelScope[s],
        aksi: perScope[s].join(', '),
      })),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'))
})

const unit = computed(() => auth.profile?.unit_kerja?.nama)
</script>

<template>
  <h1 class="text-2xl font-semibold">Selamat datang, {{ auth.profile?.nama }}</h1>
  <p v-if="auth.profile?.jabatan || unit" class="mt-1 text-redup">
    {{ [auth.profile?.jabatan, unit].filter(Boolean).join(', ') }}
  </p>
  <p v-if="peran.length" class="mt-1 text-sm text-redup">Role: {{ peran.join(', ') }}</p>
  <p v-if="galat" role="alert" class="mt-2 text-sm text-bahaya">Gagal memuat role: {{ galat }}</p>

  <p v-if="auth.profile && !auth.profile.unit_kerja_id" class="mt-4 max-w-prose rounded-md bg-waspada-muda px-4 py-3 text-sm text-waspada">
    Akun Anda belum ditempatkan pada unit kerja, sehingga hak akses dengan cakupan unit kerja belum berlaku.
    Minta administrator mengisinya.
  </p>

  <section class="mt-8">
    <h2 class="text-lg font-semibold">Hak akses Anda</h2>
    <p class="mt-1 max-w-prose text-sm text-redup">
      Daftar ini menentukan menu yang tampil dan data yang dapat Anda lihat. Dashboard pegawai dan pimpinan
      (tugas aktif, pengajuan, agenda) akan ditambahkan setelah modul Monitoring tugas dan Pengumuman selesai.
    </p>

    <p v-if="ringkasan.length === 0" class="mt-4 rounded-md border border-garis bg-white px-4 py-6 text-sm text-redup">
      Akun Anda belum memiliki hak akses apa pun. Minta administrator menetapkan role untuk Anda.
    </p>

    <div v-else class="mt-4 overflow-x-auto rounded-lg border border-garis bg-white">
      <table class="w-full min-w-[32rem] text-left text-sm">
        <thead class="border-b border-garis bg-mist text-redup">
          <tr>
            <th scope="col" class="px-4 py-2.5 font-medium">Modul</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Cakupan data</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Tindakan yang diizinkan</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-garis">
          <template v-for="m in ringkasan" :key="m.modul">
            <tr v-for="(b, i) in m.baris" :key="m.modul + b.scope">
              <th v-if="i === 0" scope="row" :rowspan="m.baris.length" class="px-4 py-2.5 align-top font-medium">
                {{ m.label }}
              </th>
              <td class="px-4 py-2.5">{{ b.scope }}</td>
              <td class="px-4 py-2.5">{{ b.aksi }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
