<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { ratakanUnit } from '@/modules/administrasi-sistem/lib/pengguna'
import { idTurunan } from '@/modules/administrasi-sistem/lib/organisasi'
import { PER_HALAMAN, ambilHalaman, filterPegawai, hitungPerJenis, labelNomorInduk } from '../lib/pegawai'
import PegawaiEditor from '../components/PegawaiEditor.vue'

const KOLOM =
  'id, jenis, nomor_induk, nama, jk, pendidikan, jabatan, unit_kerja_id, unit, subunit, foto, aktif, no_hp, email, ' +
  'pangkat, tmt_pangkat, tmt_kgb, gaji, masa_kerja_tahun, masa_kerja_bulan, tgl_sk_kgb_sebelumnya, ' +
  'no_sk_kgb_sebelumnya, batas_usia_pensiun, akhir_kontrak, jenis_pekerjaan'

const { can } = usePermission()
const bolehTambah = computed(() => can('pegawai', 'CREATE'))

const daftar = ref([])
const units = ref([])
const memuat = ref(true)
const galat = ref('')
const sukses = ref('')

const jenis = ref('semua')
const status = ref('aktif')
const unitDipilih = ref('')
const cari = ref('')
const halaman = ref(1)
const editor = ref(null) // { pegawai: object|null }

async function muat() {
  memuat.value = true
  galat.value = ''
  try {
    const [p, u] = await Promise.all([
      supabase.from('pegawai').select(KOLOM).order('nama'),
      supabase.from('unit_kerja').select('id, nama, parent_id, urutan, aktif'),
    ])
    if (p.error) throw p.error
    if (u.error) throw u.error
    daftar.value = p.data ?? []
    units.value = u.data ?? []
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    memuat.value = false
  }
}
onMounted(muat)

const unitDatar = computed(() => ratakanUnit(units.value))
const namaUnit = computed(() => new Map(units.value.map((u) => [u.id, u.nama])))

const unitIds = computed(() => {
  if (!unitDipilih.value || unitDipilih.value === '__tanpa__') return null
  const ids = idTurunan(units.value, unitDipilih.value)
  ids.add(unitDipilih.value)
  return ids
})
const saringDasar = computed(() => ({
  unitIds: unitIds.value,
  tanpaUnit: unitDipilih.value === '__tanpa__',
  cari: cari.value,
  status: status.value,
}))
const jumlah = computed(() => hitungPerJenis(filterPegawai(daftar.value, { ...saringDasar.value, jenis: 'semua' })))
const tersaring = computed(() => filterPegawai(daftar.value, { ...saringDasar.value, jenis: jenis.value }))
const hal = computed(() => ambilHalaman(tersaring.value, halaman.value))
const jumlahTanpaUnit = computed(() => daftar.value.filter((p) => p.aktif && !p.unit_kerja_id).length)

watch([jenis, status, unitDipilih, cari], () => {
  halaman.value = 1
})

const TAB = [
  { id: 'semua', label: 'Semua' },
  { id: 'ASN', label: 'ASN' },
  { id: 'PPPK', label: 'PPPK' },
  { id: 'PJLP', label: 'PJLP' },
]

function unitTampil(p) {
  if (p.unit_kerja_id) return { teks: namaUnit.value.get(p.unit_kerja_id) ?? '-', peringatan: false }
  const lama = p.subunit || p.unit
  return { teks: lama ? `${lama} (belum dipetakan)` : 'Belum diisi', peringatan: true }
}

function setelahTersimpan(pesan) {
  sukses.value = pesan
  muat()
}
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">Data pegawai</h1>
      <p class="mt-2 max-w-prose text-sm leading-relaxed text-redup">
        ASN, PPPK, dan PJLP BPKAD. Daftar yang tampil mengikuti cakupan data Anda.
      </p>
    </div>
    <button
      v-if="bolehTambah"
      type="button"
      class="flex items-center gap-1.5 rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800"
      @click="editor = { pegawai: null }"
    >
      <Plus :size="16" />
      Tambah pegawai
    </button>
  </div>

  <p v-if="sukses" role="status" class="mt-5 rounded-md bg-sukses-muda px-4 py-2.5 text-sm text-sukses">{{ sukses }}</p>

  <p v-if="jumlahTanpaUnit > 0 && bolehTambah" class="mt-5 rounded-md bg-waspada-muda px-4 py-3 text-sm text-waspada">
    {{ jumlahTanpaUnit }} pegawai aktif belum terhubung ke unit kerja pada struktur organisasi. Pilih
    "Belum punya unit kerja" pada filter unit untuk melengkapinya.
  </p>

  <div class="mt-6 flex flex-wrap items-end gap-3">
    <div class="min-w-0 flex-1 basis-56">
      <label for="cari-pegawai" class="block text-sm font-medium">Cari</label>
      <input id="cari-pegawai" v-model="cari" type="search" placeholder="Nama, nomor induk, atau jabatan" class="mt-1.5 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm" />
    </div>
    <div class="min-w-0 basis-56">
      <label for="unit-pegawai" class="block text-sm font-medium">Unit kerja</label>
      <select id="unit-pegawai" v-model="unitDipilih" class="mt-1.5 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm">
        <option value="">Semua unit</option>
        <option v-for="u in unitDatar" :key="u.id" :value="u.id">{{ '\u00A0\u00A0'.repeat(u.depth) + u.nama }}</option>
        <option value="__tanpa__">Belum punya unit kerja</option>
      </select>
    </div>
    <div>
      <label for="status-pegawai" class="block text-sm font-medium">Status</label>
      <select id="status-pegawai" v-model="status" class="mt-1.5 rounded-md border border-garis bg-white px-3 py-2 text-sm">
        <option value="aktif">Aktif</option>
        <option value="nonaktif">Nonaktif</option>
        <option value="semua">Semua</option>
      </select>
    </div>
  </div>

  <div class="mt-4 flex gap-1 border-b border-garis" role="tablist" aria-label="Jenis pegawai">
    <button
      v-for="t in TAB"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="jenis === t.id"
      :class="['-mb-px border-b-2 px-4 py-2.5 text-sm', jenis === t.id ? 'border-barito-700 font-semibold text-barito-800' : 'border-transparent text-redup hover:text-ink']"
      @click="jenis = t.id"
    >
      {{ t.label }} <span class="text-xs text-redup">({{ jumlah[t.id] }})</span>
    </button>
  </div>

  <p v-if="galat" role="alert" class="mt-4 rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">
    Gagal memuat data: {{ galat }}
    <button type="button" class="ml-2 underline" @click="muat">Coba lagi</button>
  </p>
  <p v-else-if="memuat" class="mt-6 text-sm text-redup">Memuat data pegawai...</p>

  <template v-else>
    <div class="mt-4 overflow-x-auto rounded-lg border border-garis bg-white">
      <table class="w-full min-w-[44rem] text-left text-sm">
        <thead class="border-b border-garis bg-mist text-redup">
          <tr>
            <th scope="col" class="px-4 py-2.5 font-medium">Pegawai</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Jenis</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Jabatan</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Unit kerja</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-garis">
          <tr v-if="hal.baris.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-redup">Tidak ada pegawai yang cocok.</td>
          </tr>
          <tr v-for="p in hal.baris" :key="p.id" class="hover:bg-mist/60">
            <td class="px-4 py-2.5">
              <button type="button" class="text-left font-medium text-barito-700 hover:underline" @click="editor = { pegawai: p }">{{ p.nama }}</button>
              <p class="text-xs text-redup">{{ labelNomorInduk[p.jenis] }} {{ p.nomor_induk }}</p>
            </td>
            <td class="px-3 py-2.5">{{ p.jenis }}</td>
            <td class="px-3 py-2.5">{{ p.jabatan || '-' }}</td>
            <td class="px-3 py-2.5">
              <span :class="unitTampil(p).peringatan ? 'text-waspada' : ''">{{ unitTampil(p).teks }}</span>
            </td>
            <td class="px-3 py-2.5">
              <span :class="['inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', p.aktif ? 'bg-sukses-muda text-sukses' : 'bg-mist text-redup']">
                {{ p.aktif ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="hal.jumlahHalaman > 1" class="mt-3 flex items-center justify-between text-sm">
      <p class="text-redup">
        {{ (hal.halaman - 1) * PER_HALAMAN + 1 }}-{{ Math.min(hal.halaman * PER_HALAMAN, hal.total) }} dari {{ hal.total }}
      </p>
      <div class="flex items-center gap-2">
        <button type="button" class="rounded-md border border-garis bg-white px-3 py-1.5 hover:bg-mist disabled:opacity-50" :disabled="hal.halaman <= 1" @click="halaman = hal.halaman - 1">Sebelumnya</button>
        <span class="text-redup">Halaman {{ hal.halaman }} dari {{ hal.jumlahHalaman }}</span>
        <button type="button" class="rounded-md border border-garis bg-white px-3 py-1.5 hover:bg-mist disabled:opacity-50" :disabled="hal.halaman >= hal.jumlahHalaman" @click="halaman = hal.halaman + 1">Berikutnya</button>
      </div>
    </div>
  </template>

  <PegawaiEditor
    v-if="editor"
    :pegawai="editor.pegawai"
    :units="unitDatar"
    @tutup="editor = null"
    @tersimpan="setelahTersimpan"
  />
</template>
