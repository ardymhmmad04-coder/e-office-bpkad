<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { KUNCI_TEMPLAT, TAB, filterCuti, hitungPerTab, rentangTanggal, statusTampil } from '../lib/cuti'
import { PER_HALAMAN, ambilHalaman } from '../lib/pegawai'
import CutiDetail from '../components/CutiDetail.vue'
import CutiEditor from '../components/CutiEditor.vue'

const KOLOM_CUTI =
  'id, pegawai_id, nip, nama, unit, unit_kerja_id, jenis_cuti, tgl_mulai, tgl_selesai, hari_kerja, keperluan, alamat, ' +
  'wa_pegawai, wa_atasan1, wa_atasan2, status, step, step1_by, step1_at, step1_note, step2_by, step2_at, step2_note, ' +
  'final_by, final_at, final_note, no_surat, tahun, diajukan_oleh, created_by, created_at'

const { can } = usePermission()
const bolehBuat = computed(() => can('cuti', 'CREATE'))

const daftar = ref([])
const pegawai = ref([])
const jenis = ref([])
const templat = ref({})
const memuat = ref(true)
const galat = ref('')
const sukses = ref('')

const tab = ref('semua')
const cari = ref('')
const tahun = ref('semua')
const halaman = ref(1)
const panel = ref(null) // { mode: 'detail' | 'editor', id: string | null }

async function muat() {
  memuat.value = true
  galat.value = ''
  try {
    const [c, p, j, t] = await Promise.all([
      supabase.from('cuti').select(KOLOM_CUTI).order('tgl_mulai', { ascending: false }),
      supabase.from('pegawai').select('id, nama, nomor_induk, jenis, no_hp, aktif').eq('aktif', true).order('nama'),
      supabase.from('jenis_cuti').select('nama, kurangi_tahunan, boleh_lebih, hari_kalender, urutan').eq('aktif', true).order('urutan'),
      supabase.from('pengaturan').select('kunci, nilai').in('kunci', KUNCI_TEMPLAT),
    ])
    for (const h of [c, p, j, t]) if (h.error) throw h.error
    daftar.value = c.data ?? []
    pegawai.value = p.data ?? []
    jenis.value = j.data ?? []
    templat.value = Object.fromEntries((t.data ?? []).filter((x) => x.nilai).map((x) => [x.kunci, x.nilai]))
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    memuat.value = false
  }
}
onMounted(muat)

const tahunTersedia = computed(() => {
  const s = new Set(daftar.value.map((c) => c.tahun).filter((x) => x != null))
  s.add(new Date().getFullYear())
  return [...s].sort((a, b) => b - a)
})
const jumlah = computed(() => hitungPerTab(filterCuti(daftar.value, { cari: cari.value, tahun: tahun.value })))
const tersaring = computed(() => filterCuti(daftar.value, { tab: tab.value, cari: cari.value, tahun: tahun.value }))
const hal = computed(() => ambilHalaman(tersaring.value, halaman.value))
const menunggu = computed(() => daftar.value.filter((c) => c.status === 'step1' || c.status === 'step2').length)

watch([tab, cari, tahun], () => {
  halaman.value = 1
})

const cutiTerpilih = computed(() => (panel.value?.id ? daftar.value.find((c) => c.id === panel.value.id) ?? null : null))
// Bila pengajuan yang dibuka sudah tidak ada (mis. dihapus), tutup panelnya
watch(cutiTerpilih, (nilai) => {
  if (panel.value?.mode === 'detail' && panel.value.id && nilai === null && !memuat.value) panel.value = null
})

function bukaDetail(c) {
  panel.value = { mode: 'detail', id: c.id }
}
function setelahBerubah(pesan) {
  if (pesan) sukses.value = pesan
  muat()
}
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">Cuti</h1>
      <p class="mt-2 max-w-prose text-sm leading-relaxed text-redup">
        Pengajuan cuti pegawai. Alur: draf, persetujuan Kasubbag, persetujuan Kabid, lalu persetujuan akhir oleh Admin
        yang menerbitkan nomor surat.
      </p>
    </div>
    <button
      v-if="bolehBuat"
      type="button"
      class="flex items-center gap-1.5 rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800"
      @click="panel = { mode: 'editor', id: null }"
    >
      <Plus :size="16" />
      Ajukan cuti
    </button>
  </div>

  <p v-if="sukses" role="status" class="mt-5 rounded-md bg-sukses-muda px-4 py-2.5 text-sm text-sukses">{{ sukses }}</p>
  <p v-if="menunggu > 0 && !memuat" class="mt-5 rounded-md bg-waspada-muda px-4 py-3 text-sm text-waspada">
    {{ menunggu }} pengajuan sedang dalam proses persetujuan.
  </p>

  <div class="mt-6 flex flex-wrap items-end gap-3">
    <div class="min-w-0 flex-1 basis-56">
      <label for="cari-cuti" class="block text-sm font-medium">Cari</label>
      <input id="cari-cuti" v-model="cari" type="search" placeholder="Nama, NIP, jenis cuti, atau nomor surat" class="mt-1.5 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm" />
    </div>
    <div>
      <label for="tahun-cuti" class="block text-sm font-medium">Tahun</label>
      <select id="tahun-cuti" v-model="tahun" class="mt-1.5 rounded-md border border-garis bg-white px-3 py-2 text-sm">
        <option value="semua">Semua tahun</option>
        <option v-for="t in tahunTersedia" :key="t" :value="String(t)">{{ t }}</option>
      </select>
    </div>
  </div>

  <div class="mt-4 flex flex-wrap gap-1 border-b border-garis" role="tablist" aria-label="Status pengajuan">
    <button
      v-for="t in TAB"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="tab === t.id"
      :class="['-mb-px border-b-2 px-4 py-2.5 text-sm', tab === t.id ? 'border-barito-700 font-semibold text-barito-800' : 'border-transparent text-redup hover:text-ink']"
      @click="tab = t.id"
    >
      {{ t.label }} <span class="text-xs text-redup">({{ jumlah[t.id] }})</span>
    </button>
  </div>

  <p v-if="galat" role="alert" class="mt-4 rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">
    Gagal memuat data: {{ galat }}
    <button type="button" class="ml-2 underline" @click="muat">Coba lagi</button>
  </p>
  <p v-else-if="memuat" class="mt-6 text-sm text-redup">Memuat data cuti...</p>

  <template v-else>
    <div class="mt-4 overflow-x-auto rounded-lg border border-garis bg-white">
      <table class="w-full min-w-[48rem] text-left text-sm">
        <thead class="border-b border-garis bg-mist text-redup">
          <tr>
            <th scope="col" class="px-4 py-2.5 font-medium">Pegawai</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Jenis cuti</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Tanggal</th>
            <th scope="col" class="px-3 py-2.5 text-right font-medium">Hari</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Status</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Nomor surat</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-garis">
          <tr v-if="hal.baris.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-redup">Tidak ada pengajuan cuti yang cocok.</td>
          </tr>
          <tr v-for="c in hal.baris" :key="c.id" class="hover:bg-mist/60">
            <td class="px-4 py-2.5">
              <button type="button" class="text-left font-medium text-barito-700 hover:underline" @click="bukaDetail(c)">{{ c.nama }}</button>
              <p class="text-xs text-redup">{{ c.nip }}</p>
            </td>
            <td class="px-3 py-2.5">{{ c.jenis_cuti }}</td>
            <td class="px-3 py-2.5">{{ rentangTanggal(c) }}</td>
            <td class="px-3 py-2.5 text-right tabular-nums">{{ c.hari_kerja ?? '-' }}</td>
            <td class="px-3 py-2.5">
              <span :class="['inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', statusTampil(c).kelas]">{{ statusTampil(c).label }}</span>
            </td>
            <td class="px-3 py-2.5">{{ c.no_surat || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="hal.jumlahHalaman > 1" class="mt-3 flex items-center justify-between text-sm">
      <p class="text-redup">{{ (hal.halaman - 1) * PER_HALAMAN + 1 }}-{{ Math.min(hal.halaman * PER_HALAMAN, hal.total) }} dari {{ hal.total }}</p>
      <div class="flex items-center gap-2">
        <button type="button" class="rounded-md border border-garis bg-white px-3 py-1.5 hover:bg-mist disabled:opacity-50" :disabled="hal.halaman <= 1" @click="halaman = hal.halaman - 1">Sebelumnya</button>
        <span class="text-redup">Halaman {{ hal.halaman }} dari {{ hal.jumlahHalaman }}</span>
        <button type="button" class="rounded-md border border-garis bg-white px-3 py-1.5 hover:bg-mist disabled:opacity-50" :disabled="hal.halaman >= hal.jumlahHalaman" @click="halaman = hal.halaman + 1">Berikutnya</button>
      </div>
    </div>
  </template>

  <CutiEditor
    v-if="panel?.mode === 'editor'"
    :cuti="panel.id ? cutiTerpilih : null"
    :pegawai-list="pegawai"
    :jenis-list="jenis"
    @tutup="panel = null"
    @tersimpan="setelahBerubah"
  />
  <CutiDetail
    v-else-if="panel?.mode === 'detail' && cutiTerpilih"
    :cuti="cutiTerpilih"
    :templat="templat"
    @tutup="panel = null"
    @berubah="setelahBerubah"
    @ubah="panel = { mode: 'editor', id: cutiTerpilih.id }"
  />
</template>
