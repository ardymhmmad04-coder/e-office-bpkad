<script setup>
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'
import { tambahBulan } from '../lib/cuti'

const props = defineProps({
  cuti: { type: Object, default: null }, // null = pengajuan baru
  pegawaiList: { type: Array, default: () => [] },
  jenisList: { type: Array, default: () => [] },
})
const emit = defineEmits(['tutup', 'tersimpan'])

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const auth = useAuthStore()

const idKerja = ref(props.cuti?.id ?? null) // terisi setelah draf pertama tersimpan
const baru = computed(() => idKerja.value === null)

function pegawaiAwal() {
  if (props.cuti) return props.cuti.pegawai_id
  const sendiri = auth.profile?.pegawai_id
  if (sendiri && props.pegawaiList.some((p) => p.id === sendiri)) return sendiri
  return props.pegawaiList.length === 1 ? props.pegawaiList[0].id : ''
}

const form = ref({
  pegawai_id: pegawaiAwal(),
  jenis_cuti: props.cuti?.jenis_cuti ?? props.jenisList[0]?.nama ?? 'Cuti Tahunan',
  tgl_mulai: props.cuti?.tgl_mulai ?? '',
  tgl_selesai: props.cuti?.tgl_selesai ?? '',
  keperluan: props.cuti?.keperluan ?? '',
  alamat: props.cuti?.alamat ?? '',
  wa_pegawai: props.cuti?.wa_pegawai ?? '',
  wa_atasan1: props.cuti?.wa_atasan1 ?? '',
  wa_atasan2: props.cuti?.wa_atasan2 ?? '',
})

const jenisDipilih = computed(() => props.jenisList.find((j) => j.nama === form.value.jenis_cuti) ?? null)
const kalender = computed(() => !!jenisDipilih.value?.hari_kalender)

// Nomor WhatsApp pegawai diisi otomatis dari data pegawai (bila masih kosong)
watch(
  () => form.value.pegawai_id,
  (id) => {
    if (!baru.value) return
    const p = props.pegawaiList.find((x) => x.id === id)
    if (p?.no_hp && !form.value.wa_pegawai) form.value.wa_pegawai = p.no_hp
  },
  { immediate: true }
)

// Cuti melahirkan: tanggal selesai otomatis 3 bulan setelah tanggal mulai (masih dapat diubah)
watch([() => form.value.jenis_cuti, () => form.value.tgl_mulai], () => {
  if (jenisDipilih.value?.hari_kalender && form.value.tgl_mulai) {
    form.value.tgl_selesai = tambahBulan(form.value.tgl_mulai, 3)
  }
})

// ----- Pratinjau jumlah hari (dihitung server: akhir pekan dan hari libur nasional dikecualikan) -----
const hari = ref(null)
const galatHari = ref('')
let urutHari = 0
watch(
  () => [form.value.jenis_cuti, form.value.tgl_mulai, form.value.tgl_selesai],
  async ([jenis, mulai, selesai]) => {
    const urut = ++urutHari
    hari.value = null
    galatHari.value = ''
    if (!mulai || !selesai || selesai < mulai) return
    const { data, error } = await supabase.rpc('hitung_hari_cuti', { p_jenis: jenis, p_mulai: mulai, p_selesai: selesai })
    if (urut !== urutHari) return // jawaban basi
    if (error) {
      console.error(error)
      galatHari.value = pesanError(error)
      return
    }
    hari.value = data
  },
  { immediate: true }
)

// ----- Sisa cuti tahunan -----
const sisa = ref(null)
const galatSisa = ref('')
let urutSisa = 0
watch(
  () => [form.value.pegawai_id, form.value.tgl_mulai],
  async ([id, mulai]) => {
    const urut = ++urutSisa
    sisa.value = null
    galatSisa.value = ''
    if (!id) return
    const tahun = mulai ? Number(mulai.slice(0, 4)) : new Date().getFullYear()
    const { data, error } = await supabase.rpc('sisa_cuti', { p_pegawai: id, p_tahun: tahun })
    if (urut !== urutSisa) return
    if (error) {
      console.error(error)
      galatSisa.value = pesanError(error)
      return
    }
    sisa.value = Array.isArray(data) ? (data[0] ?? null) : data
  },
  { immediate: true }
)
const tahunSisa = computed(() => (form.value.tgl_mulai ? Number(form.value.tgl_mulai.slice(0, 4)) : new Date().getFullYear()))

const mengurangi = computed(() => !!jenisDipilih.value?.kurangi_tahunan)
const melebihi = computed(() => mengurangi.value && !!sisa.value && hari.value !== null && hari.value > sisa.value.sisa)
const diblokir = computed(() => melebihi.value && !jenisDipilih.value?.boleh_lebih)

// ----- Simpan -----
const sibuk = ref('')
const galat = ref('')
const teks = (v) => {
  const s = (v ?? '').trim()
  return s === '' ? null : s
}

async function simpan(ajukan) {
  galat.value = ''
  const f = form.value
  if (!f.pegawai_id) return (galat.value = 'Pilih pegawai terlebih dahulu.')
  if (!f.tgl_mulai || !f.tgl_selesai) return (galat.value = 'Tanggal mulai dan tanggal selesai wajib diisi.')
  if (f.tgl_selesai < f.tgl_mulai) return (galat.value = 'Tanggal selesai tidak boleh sebelum tanggal mulai.')
  if (hari.value === null) {
    return (galat.value = galatHari.value || 'Jumlah hari cuti belum selesai dihitung. Tunggu sebentar lalu coba lagi.')
  }
  if (hari.value <= 0) {
    return (galat.value = 'Rentang tanggal tidak memuat hari cuti (seluruhnya akhir pekan atau hari libur).')
  }
  if (diblokir.value) {
    return (galat.value = `Melebihi sisa cuti tahunan (${sisa.value.sisa} hari). Hubungi Admin untuk menyesuaikan alokasi pegawai ini.`)
  }

  sibuk.value = ajukan ? 'ajukan' : 'draf'
  try {
    const isi = {
      jenis_cuti: f.jenis_cuti,
      tgl_mulai: f.tgl_mulai,
      tgl_selesai: f.tgl_selesai,
      keperluan: teks(f.keperluan),
      alamat: teks(f.alamat),
      wa_pegawai: teks(f.wa_pegawai),
      wa_atasan1: teks(f.wa_atasan1),
      wa_atasan2: teks(f.wa_atasan2),
    }
    let id = idKerja.value
    if (id === null) {
      const { data, error } = await supabase.from('cuti').insert({ pegawai_id: f.pegawai_id, ...isi }).select('id')
      if (error) throw error
      if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
      id = data[0].id
      idKerja.value = id // dari sini penyimpanan berikutnya mengubah draf yang sama, bukan membuat baru
    } else {
      const { data, error } = await supabase.from('cuti').update(isi).eq('id', id).select('id')
      if (error) throw error
      if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    }

    if (ajukan) {
      const { error } = await supabase.rpc('cuti_ajukan', { p_id: id })
      if (error) {
        emit('tersimpan', null) // draf sudah tersimpan: segarkan daftar
        throw new Error(`Draf tersimpan, tetapi pengajuan gagal: ${pesanError(error)}`)
      }
    }
    emit('tersimpan', ajukan ? 'Cuti diajukan.' : 'Draf cuti tersimpan.')
    emit('tutup')
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}

const kelasInput = 'mt-1 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm disabled:bg-mist'
</script>

<template>
  <div class="fixed inset-0 z-40 bg-ink/40" aria-hidden="true" @click="emit('tutup')"></div>

  <aside
    class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    :aria-label="baru ? 'Ajukan cuti' : 'Ubah draf cuti'"
    @keydown.esc="emit('tutup')"
  >
    <header class="flex items-center justify-between gap-3 border-b border-garis px-5 py-4">
      <h2 class="text-lg font-semibold">{{ baru ? 'Ajukan cuti' : 'Ubah draf cuti' }}</h2>
      <button type="button" class="rounded p-1.5 hover:bg-mist" aria-label="Tutup" @click="emit('tutup')"><X :size="20" /></button>
    </header>

    <form class="flex-1 space-y-5 overflow-y-auto px-5 py-5" @submit.prevent="simpan(false)">
      <div>
        <label for="ct-pegawai" class="block text-sm font-medium">Pegawai</label>
        <select id="ct-pegawai" v-model="form.pegawai_id" :disabled="!baru" :class="kelasInput">
          <option value="">Pilih pegawai</option>
          <option v-for="p in pegawaiList" :key="p.id" :value="p.id">{{ p.nama }} ({{ p.jenis }}, {{ p.nomor_induk }})</option>
        </select>
        <p v-if="pegawaiList.length === 0" class="mt-1 text-xs text-waspada">
          Tidak ada data pegawai yang dapat dipilih. Akun Anda mungkin belum ditautkan ke data pegawai.
        </p>
      </div>

      <div>
        <label for="ct-jenis" class="block text-sm font-medium">Jenis cuti</label>
        <select id="ct-jenis" v-model="form.jenis_cuti" :class="kelasInput">
          <option v-for="j in jenisList" :key="j.nama" :value="j.nama">{{ j.nama }}</option>
        </select>
        <p v-if="kalender" class="mt-1 text-xs text-redup">Dihitung hari kalender; tanggal selesai terisi otomatis 3 bulan setelah tanggal mulai (dapat diubah).</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="ct-mulai" class="block text-sm font-medium">Tanggal mulai</label>
          <input id="ct-mulai" v-model="form.tgl_mulai" type="date" :class="kelasInput" />
        </div>
        <div>
          <label for="ct-selesai" class="block text-sm font-medium">Tanggal selesai</label>
          <input id="ct-selesai" v-model="form.tgl_selesai" type="date" :min="form.tgl_mulai || undefined" :class="kelasInput" />
        </div>
      </div>

      <div class="rounded-md bg-mist px-4 py-3 text-sm" aria-live="polite">
        <p v-if="hari !== null">
          Jumlah hari cuti: <strong>{{ hari }}</strong> {{ kalender ? 'hari kalender' : 'hari kerja' }}
          <span v-if="!kalender" class="text-redup">(akhir pekan dan hari libur nasional tidak dihitung)</span>
        </p>
        <p v-else-if="galatHari" class="text-bahaya">{{ galatHari }}</p>
        <p v-else class="text-redup">Isi tanggal mulai dan selesai untuk melihat jumlah hari cuti.</p>

        <p v-if="sisa" class="mt-1">
          Sisa cuti tahunan {{ tahunSisa }}: <strong>{{ sisa.sisa }}</strong> hari
          <span class="text-redup">(alokasi {{ sisa.alokasi }} + sisa tahun lalu {{ sisa.carryover }} - terpakai {{ sisa.terpakai }})</span>
        </p>
        <p v-else-if="galatSisa" class="mt-1 text-bahaya">{{ galatSisa }}</p>
      </div>

      <p v-if="diblokir" role="alert" class="rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">
        Melebihi sisa cuti tahunan ({{ sisa.sisa }} hari). Hubungi Admin untuk menyesuaikan alokasi pegawai ini.
      </p>
      <p v-else-if="melebihi" class="rounded-md bg-waspada-muda px-3 py-2 text-sm text-waspada">
        Jumlah hari melebihi sisa cuti tahunan ({{ sisa.sisa }} hari). Jenis cuti ini masih boleh diajukan.
      </p>

      <div>
        <label for="ct-perlu" class="block text-sm font-medium">Alasan / keperluan</label>
        <textarea id="ct-perlu" v-model="form.keperluan" rows="2" :class="kelasInput"></textarea>
      </div>
      <div>
        <label for="ct-alamat" class="block text-sm font-medium">Alamat selama cuti</label>
        <textarea id="ct-alamat" v-model="form.alamat" rows="2" :class="kelasInput"></textarea>
      </div>

      <fieldset class="grid gap-4 sm:grid-cols-3">
        <legend class="mb-1 text-sm font-medium">Nomor WhatsApp (untuk pemberitahuan)</legend>
        <div>
          <label for="ct-wa-pegawai" class="block text-xs text-redup">Pegawai</label>
          <input id="ct-wa-pegawai" v-model="form.wa_pegawai" :class="kelasInput" />
        </div>
        <div>
          <label for="ct-wa-1" class="block text-xs text-redup">Atasan langsung</label>
          <input id="ct-wa-1" v-model="form.wa_atasan1" :class="kelasInput" />
        </div>
        <div>
          <label for="ct-wa-2" class="block text-xs text-redup">Pejabat berwenang</label>
          <input id="ct-wa-2" v-model="form.wa_atasan2" :class="kelasInput" />
        </div>
      </fieldset>

      <p v-if="galat" role="alert" class="rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ galat }}</p>

      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" class="rounded-md border border-barito-700 px-4 py-2 text-sm font-semibold text-barito-800 hover:bg-barito-50 disabled:opacity-60" :disabled="sibuk !== ''">
          {{ sibuk === 'draf' ? 'Menyimpan...' : 'Simpan sebagai draf' }}
        </button>
        <button type="button" class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60" :disabled="sibuk !== ''" @click="simpan(true)">
          {{ sibuk === 'ajukan' ? 'Mengajukan...' : 'Simpan dan ajukan' }}
        </button>
        <button type="button" class="rounded-md border border-garis px-4 py-2 text-sm hover:bg-mist" @click="emit('tutup')">Batal</button>
      </div>
    </form>
  </aside>
</template>
