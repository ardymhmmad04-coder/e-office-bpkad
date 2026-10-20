<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { ratakanUnit } from '../lib/pengguna'
import PenggunaEditor from './PenggunaEditor.vue'

const daftar = ref([])
const unit = ref([])
const peran = ref([])
const memuat = ref(true)
const galat = ref('')
const cari = ref('')
const filter = ref('semua')
const terpilih = ref(null)

async function muat() {
  memuat.value = true
  galat.value = ''
  try {
    const [p, u, r] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nip, nama, email, jabatan, aktif, unit_kerja_id, pegawai_id, unit_kerja:unit_kerja_id(nama), user_roles(role_id, roles(kode, nama))')
        .order('nama'),
      supabase.from('unit_kerja').select('id, nama, parent_id, urutan, aktif'),
      supabase.from('roles').select('id, kode, nama, deskripsi, is_system').order('nama'),
    ])
    for (const hasil of [p, u, r]) if (hasil.error) throw hasil.error
    daftar.value = p.data ?? []
    unit.value = ratakanUnit(u.data ?? [])
    peran.value = r.data ?? []
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    memuat.value = false
  }
}
onMounted(muat)

const namaRole = (p) => (p.user_roles ?? []).map((x) => x.roles?.nama).filter(Boolean).join(', ')

const tampil = computed(() => {
  const k = cari.value.trim().toLowerCase()
  return daftar.value.filter((p) => {
    if (filter.value === 'aktif' && !p.aktif) return false
    if (filter.value === 'nonaktif' && p.aktif) return false
    if (filter.value === 'tanpa_unit' && p.unit_kerja_id) return false
    if (filter.value === 'tanpa_tautan' && p.pegawai_id) return false
    if (!k) return true
    return [p.nama, p.email, p.nip, p.jabatan].some((v) => (v ?? '').toLowerCase().includes(k))
  })
})

const jumlahTanpaUnit = computed(() => daftar.value.filter((p) => p.aktif && !p.unit_kerja_id).length)
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <div class="min-w-0 flex-1 basis-64">
      <label for="cari-pengguna" class="block text-sm font-medium">Cari pengguna</label>
      <input
        id="cari-pengguna"
        v-model="cari"
        type="search"
        placeholder="Nama, email, NIP, atau jabatan"
        class="mt-1.5 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm"
      />
    </div>
    <div>
      <label for="filter-pengguna" class="block text-sm font-medium">Tampilkan</label>
      <select id="filter-pengguna" v-model="filter" class="mt-1.5 rounded-md border border-garis bg-white px-3 py-2 text-sm">
        <option value="semua">Semua akun</option>
        <option value="aktif">Aktif</option>
        <option value="nonaktif">Nonaktif</option>
        <option value="tanpa_unit">Belum punya unit kerja</option>
        <option value="tanpa_tautan">Belum tertaut ke pegawai</option>
      </select>
    </div>
  </div>

  <p
    v-if="jumlahTanpaUnit > 0"
    class="mt-4 rounded-md bg-waspada-muda px-4 py-3 text-sm text-waspada"
  >
    {{ jumlahTanpaUnit }} akun aktif belum punya unit kerja, sehingga hak akses dengan cakupan unit kerja belum berlaku
    bagi mereka.
  </p>

  <p v-if="galat" role="alert" class="mt-4 rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">
    Gagal memuat data: {{ galat }}
    <button type="button" class="ml-2 underline" @click="muat">Coba lagi</button>
  </p>

  <p v-else-if="memuat" class="mt-6 text-sm text-redup">Memuat data pengguna...</p>

  <div v-else class="mt-4 overflow-x-auto rounded-lg border border-garis bg-white">
    <table class="w-full min-w-[40rem] text-left text-sm">
      <thead class="border-b border-garis bg-mist text-redup">
        <tr>
          <th scope="col" class="px-4 py-2.5 font-medium">Pengguna</th>
          <th scope="col" class="px-4 py-2.5 font-medium">Unit kerja</th>
          <th scope="col" class="px-4 py-2.5 font-medium">Role</th>
          <th scope="col" class="px-4 py-2.5 font-medium">Status</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-garis">
        <tr v-if="tampil.length === 0">
          <td colspan="4" class="px-4 py-8 text-center text-redup">Tidak ada pengguna yang cocok.</td>
        </tr>
        <tr v-for="p in tampil" :key="p.id" class="hover:bg-mist/60">
          <td class="px-4 py-2.5">
            <button type="button" class="text-left font-medium text-barito-700 hover:underline" @click="terpilih = p.id">
              {{ p.nama }}
            </button>
            <p class="text-xs text-redup">{{ p.email }}</p>
          </td>
          <td class="px-4 py-2.5">
            <span v-if="p.unit_kerja?.nama">{{ p.unit_kerja.nama }}</span>
            <span v-else class="text-waspada">Belum diisi</span>
          </td>
          <td class="px-4 py-2.5">
            <span v-if="namaRole(p)">{{ namaRole(p) }}</span>
            <span v-else class="text-redup">Tanpa role</span>
          </td>
          <td class="px-4 py-2.5">
            <span
              :class="[
                'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                p.aktif ? 'bg-sukses-muda text-sukses' : 'bg-mist text-redup',
              ]"
            >
              {{ p.aktif ? 'Aktif' : 'Nonaktif' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <PenggunaEditor
    v-if="terpilih"
    :user-id="terpilih"
    :unit="unit"
    :peran="peran"
    @tutup="terpilih = null"
    @berubah="muat"
  />
</template>
