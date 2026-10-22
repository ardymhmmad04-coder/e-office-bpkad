<script setup>
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'
import { aksiTersedia, daftarNotifikasi, formatWaktu, rentangTanggal, statusTampil, tahapMenunggu } from '../lib/cuti'

const props = defineProps({
  cuti: { type: Object, required: true },
  templat: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['tutup', 'berubah', 'ubah'])

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const auth = useAuthStore()
const { can } = usePermission()

const punya = computed(() => ({
  proses: can('cuti', 'PROCESS'),
  setuju: can('cuti', 'APPROVE'),
  hapus: can('cuti', 'DELETE'),
}))
const aksi = computed(() =>
  aksiTersedia(props.cuti, { punya: punya.value, akunId: auth.profile?.id, pegawaiId: auth.profile?.pegawai_id })
)
const ada = (k) => aksi.value.includes(k)
const adaTolak = computed(() => (ada('tolak1') ? 1 : ada('tolak2') ? 2 : null))

const sibuk = ref('')
const galat = ref('')
const konfirmasi = ref('') // 'batalkan' | 'hapus'
const tolakTerbuka = ref(false)
const alasan = ref('')

async function panggil(nama, args) {
  const { error } = await supabase.rpc(nama, args)
  if (error) throw error
}

async function jalankan(kunci, fn, pesanOk) {
  sibuk.value = kunci
  galat.value = ''
  try {
    await fn()
    tolakTerbuka.value = false
    alasan.value = ''
    emit('berubah', pesanOk)
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    sibuk.value = ''
    konfirmasi.value = ''
  }
}

const id = () => props.cuti.id
const ajukan = () => jalankan('ajukan', () => panggil('cuti_ajukan', { p_id: id() }), 'Cuti diajukan.')
const setujui = (tahap) =>
  jalankan(
    `setujui${tahap}`,
    () => panggil('cuti_setujui', { p_id: id(), p_tahap: tahap }),
    tahap === 3 ? 'Persetujuan akhir dicatat dan nomor surat diterbitkan.' : 'Persetujuan dicatat.'
  )
const batalkan = () => jalankan('batalkan', () => panggil('cuti_batalkan', { p_id: id() }), 'Pengajuan dibatalkan.')
const hapus = () =>
  jalankan(
    'hapus',
    async () => {
      const { data, error } = await supabase.from('cuti').delete().eq('id', id()).select('id')
      if (error) throw error
      if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    },
    'Pengajuan dihapus.'
  )
function tolak() {
  if (!alasan.value.trim()) {
    galat.value = 'Alasan penolakan wajib diisi.'
    return
  }
  return jalankan(
    'tolak',
    () => panggil('cuti_tolak', { p_id: id(), p_tahap: adaTolak.value, p_alasan: alasan.value.trim() }),
    'Pengajuan ditolak.'
  )
}

// ----- Sisa cuti tahunan -----
const sisa = ref(null)
const galatSisa = ref('')
watch(
  () => [props.cuti.id, props.cuti.status, props.cuti.tahun],
  async () => {
    sisa.value = null
    galatSisa.value = ''
    const { data, error } = await supabase.rpc('sisa_cuti', { p_pegawai: props.cuti.pegawai_id, p_tahun: props.cuti.tahun })
    if (error) {
      console.error(error)
      galatSisa.value = pesanError(error)
      return
    }
    sisa.value = Array.isArray(data) ? (data[0] ?? null) : data
  },
  { immediate: true }
)

// ----- Alur persetujuan -----
const langkah = computed(() => {
  const c = props.cuti
  const menunggu = tahapMenunggu(c)
  const ditolak = c.status === 'rejected'
  const tahapTolak = ditolak ? (c.step2_note && c.step2_at ? 2 : 1) : null

  const uraikan = (nomor, oleh, at, note) => {
    if (ditolak && tahapTolak === nomor) {
      return { status: 'tolak', teks: `Ditolak oleh ${oleh ?? '-'}, ${formatWaktu(at)}`, catatan: note }
    }
    if (at) return { status: 'setuju', teks: `Disetujui oleh ${oleh ?? '-'}, ${formatWaktu(at)}`, catatan: note }
    if (menunggu === nomor) return { status: 'tunggu', teks: 'Menunggu', catatan: null }
    return { status: 'belum', teks: '-', catatan: null }
  }

  const akhir = c.final_at
    ? { status: 'setuju', teks: `Disetujui oleh ${c.final_by ?? '-'}, ${formatWaktu(c.final_at)}`, catatan: c.no_surat ? `Nomor surat: ${c.no_surat}` : null }
    : menunggu === 3
      ? { status: 'tunggu', teks: 'Menunggu Admin', catatan: null }
      : { status: 'belum', teks: '-', catatan: null }

  return [
    {
      judul: 'Pengajuan',
      status: c.status === 'draft' ? 'belum' : 'setuju',
      teks: c.status === 'draft' ? 'Masih draf' : `Diajukan oleh ${c.diajukan_oleh ?? '-'}`,
      catatan: null,
    },
    { judul: 'Atasan langsung (Kasubbag)', ...uraikan(1, c.step1_by, c.step1_at, c.step1_note) },
    { judul: 'Pejabat berwenang (Kabid)', ...uraikan(2, c.step2_by, c.step2_at, c.step2_note) },
    { judul: 'Persetujuan akhir (Admin)', ...akhir },
  ]
})
const WARNA = { setuju: 'bg-sukses', tolak: 'bg-bahaya', tunggu: 'bg-emas', belum: 'bg-garis' }

const notifikasi = computed(() => daftarNotifikasi(props.cuti, props.templat, { sisa: sisa.value?.sisa }))
const sedangSibuk = computed(() => sibuk.value !== '')
const tombolUtama = 'rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60'
const tombolSekunder = 'rounded-md border border-garis px-4 py-2 text-sm hover:bg-mist disabled:opacity-60'
</script>

<template>
  <div class="fixed inset-0 z-40 bg-ink/40" aria-hidden="true" @click="emit('tutup')"></div>

  <aside
    class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-label="Detail pengajuan cuti"
    @keydown.esc="emit('tutup')"
  >
    <header class="flex items-start justify-between gap-3 border-b border-garis px-5 py-4">
      <div class="min-w-0">
        <h2 class="truncate text-lg font-semibold">{{ cuti.nama }}</h2>
        <p class="text-sm text-redup">{{ cuti.nip }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span :class="['inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', statusTampil(cuti).kelas]">{{ statusTampil(cuti).label }}</span>
        <button type="button" class="rounded p-1.5 hover:bg-mist" aria-label="Tutup" @click="emit('tutup')"><X :size="20" /></button>
      </div>
    </header>

    <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
      <dl class="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-redup">Jenis cuti</dt>
          <dd class="font-medium">{{ cuti.jenis_cuti }}</dd>
        </div>
        <div>
          <dt class="text-redup">Jumlah hari</dt>
          <dd class="font-medium">{{ cuti.hari_kerja ?? '-' }} hari</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-redup">Tanggal</dt>
          <dd class="font-medium">{{ rentangTanggal(cuti) }}</dd>
        </div>
        <div v-if="cuti.keperluan" class="sm:col-span-2">
          <dt class="text-redup">Alasan / keperluan</dt>
          <dd>{{ cuti.keperluan }}</dd>
        </div>
        <div v-if="cuti.alamat" class="sm:col-span-2">
          <dt class="text-redup">Alamat selama cuti</dt>
          <dd>{{ cuti.alamat }}</dd>
        </div>
        <div v-if="cuti.no_surat" class="sm:col-span-2">
          <dt class="text-redup">Nomor surat</dt>
          <dd class="font-medium">{{ cuti.no_surat }}</dd>
        </div>
        <div v-if="sisa" class="sm:col-span-2">
          <dt class="text-redup">Sisa cuti tahunan {{ cuti.tahun }}</dt>
          <dd>
            <span class="font-medium">{{ sisa.sisa }} hari</span>
            <span class="text-redup"> (alokasi {{ sisa.alokasi }} + sisa tahun lalu {{ sisa.carryover }} - terpakai {{ sisa.terpakai }})</span>
          </dd>
        </div>
        <p v-else-if="galatSisa" class="text-sm text-bahaya sm:col-span-2">{{ galatSisa }}</p>
      </dl>

      <section>
        <h3 class="font-semibold">Alur persetujuan</h3>
        <ol class="mt-3 space-y-3">
          <li v-for="l in langkah" :key="l.judul" class="flex gap-3 text-sm">
            <span :class="['mt-1.5 size-2.5 shrink-0 rounded-full', WARNA[l.status]]" aria-hidden="true"></span>
            <div>
              <p class="font-medium">{{ l.judul }}</p>
              <p :class="l.status === 'tolak' ? 'text-bahaya' : 'text-redup'">{{ l.teks }}</p>
              <p v-if="l.catatan" class="text-redup">{{ l.status === 'tolak' ? 'Alasan: ' : '' }}{{ l.catatan }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section v-if="aksi.length">
        <h3 class="font-semibold">Tindakan</h3>
        <p v-if="punya.proses && !punya.setuju && (ada('setujui1') || ada('setujui2'))" class="mt-1 text-xs text-redup">
          Sebagai Admin, Anda mencatat persetujuan atas nama pejabat setelah pejabat tersebut menyetujui.
        </p>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button v-if="ada('ajukan')" type="button" :class="tombolUtama" :disabled="sedangSibuk" @click="ajukan">
            {{ sibuk === 'ajukan' ? 'Mengajukan...' : 'Ajukan' }}
          </button>
          <button v-if="ada('ubah')" type="button" :class="tombolSekunder" :disabled="sedangSibuk" @click="emit('ubah')">Ubah draf</button>

          <button v-if="ada('setujui1')" type="button" :class="tombolUtama" :disabled="sedangSibuk" @click="setujui(1)">
            {{ sibuk === 'setujui1' ? 'Memproses...' : 'Setujui (tahap Kasubbag)' }}
          </button>
          <button v-if="ada('setujui2')" type="button" :class="tombolUtama" :disabled="sedangSibuk" @click="setujui(2)">
            {{ sibuk === 'setujui2' ? 'Memproses...' : 'Setujui (tahap Kabid)' }}
          </button>
          <button v-if="ada('setujui3')" type="button" :class="tombolUtama" :disabled="sedangSibuk" @click="setujui(3)">
            {{ sibuk === 'setujui3' ? 'Memproses...' : 'Persetujuan akhir dan terbitkan nomor surat' }}
          </button>

          <button v-if="adaTolak && !tolakTerbuka" type="button" class="rounded-md border border-bahaya/40 px-4 py-2 text-sm text-bahaya hover:bg-bahaya-muda disabled:opacity-60" :disabled="sedangSibuk" @click="tolakTerbuka = true">
            Tolak
          </button>
        </div>

        <div v-if="tolakTerbuka" class="mt-3 space-y-2 rounded-md border border-garis p-3">
          <label for="cd-alasan" class="block text-sm font-medium">Alasan penolakan</label>
          <textarea id="cd-alasan" v-model="alasan" rows="2" class="w-full rounded-md border border-garis px-3 py-2 text-sm"></textarea>
          <div class="flex gap-2">
            <button type="button" class="rounded-md bg-bahaya px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" :disabled="sedangSibuk" @click="tolak">
              {{ sibuk === 'tolak' ? 'Memproses...' : 'Tolak pengajuan' }}
            </button>
            <button type="button" :class="tombolSekunder" @click="tolakTerbuka = false">Batal</button>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <template v-if="ada('batalkan')">
            <button v-if="konfirmasi !== 'batalkan'" type="button" class="text-bahaya hover:underline" :disabled="sedangSibuk" @click="konfirmasi = 'batalkan'">
              Batalkan pengajuan
            </button>
            <span v-else class="flex flex-wrap items-center gap-2">
              <span class="text-bahaya">{{ cuti.status === 'approved' ? 'Batalkan cuti yang sudah disetujui? Sisa cuti akan kembali.' : 'Batalkan pengajuan ini?' }}</span>
              <button type="button" class="rounded-md bg-bahaya px-3 py-1.5 font-semibold text-white disabled:opacity-60" :disabled="sedangSibuk" @click="batalkan">Ya, batalkan</button>
              <button type="button" class="rounded-md border border-garis px-3 py-1.5 hover:bg-mist" @click="konfirmasi = ''">Tidak</button>
            </span>
          </template>
          <template v-if="ada('hapus')">
            <button v-if="konfirmasi !== 'hapus'" type="button" class="text-bahaya hover:underline" :disabled="sedangSibuk" @click="konfirmasi = 'hapus'">Hapus</button>
            <span v-else class="flex flex-wrap items-center gap-2">
              <span class="text-bahaya">Hapus pengajuan ini secara permanen?</span>
              <button type="button" class="rounded-md bg-bahaya px-3 py-1.5 font-semibold text-white disabled:opacity-60" :disabled="sedangSibuk" @click="hapus">Ya, hapus</button>
              <button type="button" class="rounded-md border border-garis px-3 py-1.5 hover:bg-mist" @click="konfirmasi = ''">Tidak</button>
            </span>
          </template>
        </div>
      </section>

      <p v-if="galat" role="alert" class="rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ galat }}</p>

      <section v-if="notifikasi.length">
        <h3 class="font-semibold">Beri tahu lewat WhatsApp</h3>
        <p class="mt-1 text-xs text-redup">Membuka WhatsApp dengan pesan yang sudah terisi; Anda yang menekan kirim.</p>
        <ul class="mt-2 space-y-1.5 text-sm">
          <li v-for="n in notifikasi" :key="n.label">
            <a :href="n.link" target="_blank" rel="noopener noreferrer" class="text-barito-700 hover:underline">{{ n.label }} ({{ n.nomor }})</a>
          </li>
        </ul>
      </section>

      <p v-if="cuti.status === 'approved'" class="text-xs text-redup">Cetak surat cuti akan tersedia pada pembaruan berikutnya.</p>
    </div>
  </aside>
</template>
