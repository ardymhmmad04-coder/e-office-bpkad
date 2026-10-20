<script setup>
import { computed, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import {
  EDU_LIST, GOL_LIST, JENIS, JENIS_PEKERJAAN, bangunPayload, bangunPayloadTerbatas,
  formAwal, kecilkanGambar, labelNomorInduk,
} from '../lib/pegawai'

const props = defineProps({
  pegawai: { type: Object, default: null }, // null = pegawai baru
  units: { type: Array, default: () => [] }, // unit kerja berurutan dengan kedalaman
})
const emit = defineEmits(['tutup', 'tersimpan'])

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const BUCKET = 'foto-pegawai'
const { can } = usePermission()

const baru = computed(() => props.pegawai === null)
// Hak penuh = boleh mengubah semua kolom; selain itu hanya kontak dan foto sendiri
const penuh = computed(() => (baru.value ? can('pegawai', 'CREATE') : can('pegawai', 'PROCESS')))
const bolehUbahKontak = computed(() => penuh.value || can('pegawai', 'EDIT'))
const bolehHapus = computed(() => !baru.value && can('pegawai', 'DELETE'))

const jenis = ref(props.pegawai?.jenis ?? 'ASN')
const form = ref(formAwal(props.pegawai))
const sibuk = ref('')
const galat = ref('')
const konfirmasiHapus = ref(false)

// Nilai lama di luar daftar pilihan tetap ditampilkan agar tidak hilang saat disimpan
const denganNilaiLama = (daftar, nilai) => (nilai && !daftar.includes(nilai) ? [nilai, ...daftar] : daftar)
const opsiPendidikan = computed(() => denganNilaiLama(EDU_LIST, form.value.pendidikan))
const opsiPangkat = computed(() => denganNilaiLama(GOL_LIST, form.value.pangkat))
const opsiPekerjaan = computed(() => denganNilaiLama(JENIS_PEKERJAAN, form.value.jenis_pekerjaan))

const dataLama = computed(() => {
  const p = props.pegawai
  if (!p || p.unit_kerja_id) return ''
  return [p.unit, p.subunit].filter(Boolean).join(' / ')
})

async function simpan() {
  galat.value = ''
  let payload
  if (penuh.value) {
    if (!String(form.value.nomor_induk).trim()) {
      galat.value = `${labelNomorInduk[jenis.value]} wajib diisi.`
      return
    }
    if (!form.value.nama.trim()) {
      galat.value = 'Nama wajib diisi.'
      return
    }
    payload = bangunPayload(form.value, jenis.value)
  } else {
    payload = bangunPayloadTerbatas(form.value)
  }

  sibuk.value = 'simpan'
  try {
    const q = baru.value
      ? supabase.from('pegawai').insert(payload).select('id')
      : supabase.from('pegawai').update(payload).eq('id', props.pegawai.id).select('id')
    const { data, error } = await q
    if (error) {
      if (error.code === '23505') throw new Error(`${labelNomorInduk[jenis.value]} tersebut sudah terdaftar untuk ${jenis.value}.`)
      throw error
    }
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    emit('tersimpan', baru.value ? 'Pegawai ditambahkan.' : 'Data pegawai tersimpan.')
    emit('tutup')
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}

async function hapus() {
  galat.value = ''
  sibuk.value = 'hapus'
  try {
    const { data, error } = await supabase.from('pegawai').delete().eq('id', props.pegawai.id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    emit('tersimpan', 'Data pegawai dihapus.')
    emit('tutup')
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
    konfirmasiHapus.value = false
  } finally {
    sibuk.value = ''
  }
}

// ----- Foto -----
const fotoSaatIni = ref(props.pegawai?.foto ?? '')
const fotoUrl = ref('')
const galatFoto = ref('')
const sibukFoto = ref(false)
const adalahUrl = (v) => /^https?:/i.test(v)

async function muatFoto() {
  galatFoto.value = ''
  const f = fotoSaatIni.value
  if (!f) {
    fotoUrl.value = ''
    return
  }
  if (adalahUrl(f)) {
    fotoUrl.value = f // foto lama (URL dari E-Kepegawaian)
    return
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f, 3600)
  if (error) {
    console.error(error)
    galatFoto.value = `Foto tidak dapat dimuat: ${pesanError(error)}`
    fotoUrl.value = ''
    return
  }
  fotoUrl.value = data.signedUrl
}
onMounted(() => {
  if (!baru.value) muatFoto()
})

async function unggahFoto(e) {
  const file = e.target.files?.[0]
  if (!file) return
  sibukFoto.value = true
  galatFoto.value = ''
  let path = null
  try {
    const blob = await kecilkanGambar(file)
    path = `${props.pegawai.id}/${crypto.randomUUID()}.jpg`
    const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (up.error) throw up.error

    const { data, error } = await supabase.from('pegawai').update({ foto: path }).eq('id', props.pegawai.id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)

    const lama = fotoSaatIni.value
    fotoSaatIni.value = path
    path = null // berhasil: jangan dibersihkan
    if (lama && !adalahUrl(lama)) {
      const r = await supabase.storage.from(BUCKET).remove([lama])
      if (r.error) console.error(r.error) // foto lama gagal dihapus: dicatat, tidak menggagalkan unggahan
    }
    await muatFoto()
    emit('tersimpan', 'Foto diperbarui.')
  } catch (err) {
    console.error(err)
    galatFoto.value = pesanError(err)
    if (path) {
      // Unggahan sempat masuk tetapi data pegawai tidak terhubung: hapus berkas yatim
      const r = await supabase.storage.from(BUCKET).remove([path])
      if (r.error) console.error(r.error)
    }
  } finally {
    sibukFoto.value = false
    e.target.value = ''
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
    :aria-label="baru ? 'Tambah pegawai' : 'Data pegawai'"
    @keydown.esc="emit('tutup')"
  >
    <header class="flex items-start justify-between gap-3 border-b border-garis px-5 py-4">
      <div class="min-w-0">
        <h2 class="truncate text-lg font-semibold">{{ baru ? 'Tambah pegawai' : pegawai.nama }}</h2>
        <p v-if="!baru" class="text-sm text-redup">{{ jenis }}, {{ labelNomorInduk[jenis] }} {{ pegawai.nomor_induk }}</p>
      </div>
      <button type="button" class="rounded p-1.5 hover:bg-mist" aria-label="Tutup" @click="emit('tutup')"><X :size="20" /></button>
    </header>

    <div class="flex-1 overflow-y-auto px-5 py-5">
      <p v-if="!penuh && !baru" class="mb-4 rounded-md bg-mist px-4 py-3 text-sm text-redup">
        {{ bolehUbahKontak ? 'Anda hanya dapat mengubah nomor HP, email, dan foto.' : 'Anda hanya dapat melihat data ini.' }}
      </p>

      <!-- Foto -->
      <section v-if="!baru" class="flex items-center gap-4 border-b border-garis pb-5">
        <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mist text-xs text-redup">
          <img v-if="fotoUrl" :src="fotoUrl" :alt="`Foto ${pegawai.nama}`" class="size-full object-cover" />
          <span v-else>Tanpa foto</span>
        </div>
        <div class="min-w-0">
          <template v-if="bolehUbahKontak">
            <label for="pg-foto" class="inline-block cursor-pointer rounded-md border border-garis px-3 py-1.5 text-sm hover:bg-mist">
              {{ sibukFoto ? 'Mengunggah...' : fotoSaatIni ? 'Ganti foto' : 'Unggah foto' }}
            </label>
            <input id="pg-foto" type="file" accept="image/*" class="sr-only" :disabled="sibukFoto" @change="unggahFoto" />
            <p class="mt-1 text-xs text-redup">Foto diperkecil otomatis sebelum diunggah.</p>
          </template>
          <p v-if="galatFoto" role="alert" class="mt-2 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ galatFoto }}</p>
        </div>
      </section>

      <form class="space-y-6" :class="baru ? '' : 'pt-5'" @submit.prevent="simpan">
        <section v-if="baru">
          <label for="pg-jenis" class="block text-sm font-medium">Jenis pegawai</label>
          <select id="pg-jenis" v-model="jenis" class="mt-1 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm">
            <option v-for="j in JENIS" :key="j" :value="j">{{ j }}</option>
          </select>
        </section>

        <section class="grid gap-4 sm:grid-cols-2">
          <h3 class="font-semibold sm:col-span-2">Data pokok</h3>
          <div>
            <label for="pg-nomor" class="block text-sm font-medium">{{ labelNomorInduk[jenis] }}</label>
            <input id="pg-nomor" v-model="form.nomor_induk" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-nama" class="block text-sm font-medium">Nama lengkap</label>
            <input id="pg-nama" v-model="form.nama" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-jk" class="block text-sm font-medium">Jenis kelamin</label>
            <select id="pg-jk" v-model="form.jk" :disabled="!penuh" :class="kelasInput">
              <option value="">Belum diisi</option>
              <option>Laki-laki</option>
              <option>Perempuan</option>
            </select>
          </div>
          <div>
            <label for="pg-pend" class="block text-sm font-medium">Pendidikan</label>
            <select id="pg-pend" v-model="form.pendidikan" :disabled="!penuh" :class="kelasInput">
              <option value="">Belum diisi</option>
              <option v-for="e in opsiPendidikan" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label for="pg-jabatan" class="block text-sm font-medium">Jabatan</label>
            <input id="pg-jabatan" v-model="form.jabatan" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div class="sm:col-span-2">
            <label for="pg-unit" class="block text-sm font-medium">Unit kerja</label>
            <select id="pg-unit" v-model="form.unit_kerja_id" :disabled="!penuh" :class="kelasInput">
              <option value="">Belum diisi</option>
              <option v-for="u in units" :key="u.id" :value="u.id">{{ '\u00A0\u00A0'.repeat(u.depth) + u.nama }}</option>
            </select>
            <p v-if="dataLama" class="mt-1 text-xs text-waspada">Data lama dari E-Kepegawaian: {{ dataLama }}. Pilih unit yang sesuai.</p>
            <p v-else class="mt-1 text-xs text-redup">Menentukan data apa yang dapat dilihat atasan pegawai ini.</p>
          </div>
          <div>
            <label for="pg-hp" class="block text-sm font-medium">Nomor HP</label>
            <input id="pg-hp" v-model="form.no_hp" :disabled="!bolehUbahKontak" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-email" class="block text-sm font-medium">Email</label>
            <input id="pg-email" v-model="form.email" type="email" :disabled="!bolehUbahKontak" :class="kelasInput" />
          </div>
          <label class="flex items-start gap-2 text-sm sm:col-span-2">
            <input v-model="form.aktif" type="checkbox" :disabled="!penuh" class="mt-0.5 size-4" />
            <span>
              Pegawai aktif
              <span class="block text-xs text-redup">Nonaktifkan pegawai yang pindah, pensiun, atau berhenti. Riwayat cutinya tetap tersimpan.</span>
            </span>
          </label>
        </section>

        <section v-if="jenis === 'ASN'" class="grid gap-4 sm:grid-cols-2">
          <h3 class="font-semibold sm:col-span-2">Kepegawaian ASN</h3>
          <div class="sm:col-span-2">
            <label for="pg-pangkat" class="block text-sm font-medium">Pangkat / golongan</label>
            <select id="pg-pangkat" v-model="form.pangkat" :disabled="!penuh" :class="kelasInput">
              <option value="">Belum diisi</option>
              <option v-for="g in opsiPangkat" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div>
            <label for="pg-tmt-pangkat" class="block text-sm font-medium">TMT pangkat</label>
            <input id="pg-tmt-pangkat" v-model="form.tmt_pangkat" type="date" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-tmt-kgb" class="block text-sm font-medium">TMT KGB terakhir</label>
            <input id="pg-tmt-kgb" v-model="form.tmt_kgb" type="date" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-gaji" class="block text-sm font-medium">Gaji pokok (Rp)</label>
            <input id="pg-gaji" v-model="form.gaji" type="number" min="0" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-bup" class="block text-sm font-medium">Batas usia pensiun (tahun)</label>
            <input id="pg-bup" v-model="form.batas_usia_pensiun" type="number" min="0" :disabled="!penuh" :class="kelasInput" />
            <p class="mt-1 text-xs text-redup">999 = tidak terbatas.</p>
          </div>
          <div>
            <label for="pg-mk-th" class="block text-sm font-medium">Masa kerja (tahun)</label>
            <input id="pg-mk-th" v-model="form.masa_kerja_tahun" type="number" min="0" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-mk-bl" class="block text-sm font-medium">Masa kerja (bulan)</label>
            <input id="pg-mk-bl" v-model="form.masa_kerja_bulan" type="number" min="0" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-sk-tgl" class="block text-sm font-medium">Tanggal SK KGB sebelumnya</label>
            <input id="pg-sk-tgl" v-model="form.tgl_sk_kgb_sebelumnya" type="date" :disabled="!penuh" :class="kelasInput" />
          </div>
          <div>
            <label for="pg-sk-no" class="block text-sm font-medium">Nomor SK KGB sebelumnya</label>
            <input id="pg-sk-no" v-model="form.no_sk_kgb_sebelumnya" :disabled="!penuh" :class="kelasInput" />
          </div>
        </section>

        <section v-else class="grid gap-4 sm:grid-cols-2">
          <h3 class="font-semibold sm:col-span-2">Kontrak {{ jenis }}</h3>
          <div v-if="jenis === 'PJLP'">
            <label for="pg-kerja" class="block text-sm font-medium">Jenis pekerjaan</label>
            <select id="pg-kerja" v-model="form.jenis_pekerjaan" :disabled="!penuh" :class="kelasInput">
              <option value="">Belum diisi</option>
              <option v-for="k in opsiPekerjaan" :key="k" :value="k">{{ k }}</option>
            </select>
          </div>
          <div>
            <label for="pg-kontrak" class="block text-sm font-medium">Akhir kontrak</label>
            <input id="pg-kontrak" v-model="form.akhir_kontrak" type="date" :disabled="!penuh" :class="kelasInput" />
          </div>
        </section>

        <p v-if="galat" role="alert" class="rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ galat }}</p>

        <div class="flex flex-wrap items-center gap-3">
          <button
            v-if="bolehUbahKontak"
            type="submit"
            class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60"
            :disabled="sibuk !== ''"
          >
            {{ sibuk === 'simpan' ? 'Menyimpan...' : baru ? 'Tambah pegawai' : 'Simpan' }}
          </button>
          <button type="button" class="rounded-md border border-garis px-4 py-2 text-sm hover:bg-mist" @click="emit('tutup')">
            {{ bolehUbahKontak ? 'Batal' : 'Tutup' }}
          </button>
        </div>

        <section v-if="bolehHapus" class="border-t border-garis pt-4">
          <h3 class="text-sm font-semibold">Hapus pegawai</h3>
          <p class="mt-1 text-sm text-redup">
            Menghapus juga menghapus seluruh riwayat cuti dan alokasi cuti pegawai ini. Untuk pegawai yang sudah tidak
            bertugas, lebih aman menonaktifkan.
          </p>
          <button v-if="!konfirmasiHapus" type="button" class="mt-2 text-sm text-bahaya hover:underline" @click="konfirmasiHapus = true">
            Hapus pegawai ini
          </button>
          <div v-else class="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span class="text-bahaya">Hapus permanen beserta riwayat cutinya?</span>
            <button type="button" class="rounded-md bg-bahaya px-3 py-1.5 font-semibold text-white disabled:opacity-60" :disabled="sibuk !== ''" @click="hapus">Ya, hapus</button>
            <button type="button" class="rounded-md border border-garis px-3 py-1.5 hover:bg-mist" @click="konfirmasiHapus = false">Batal</button>
          </div>
        </section>
      </form>
    </div>
  </aside>
</template>
