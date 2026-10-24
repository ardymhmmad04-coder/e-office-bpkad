<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { akhirPekan, hapusLibur, namaHari, parseLibur, serialisasiLibur, tambahLibur, tanggalPanjang } from '../lib/cutiPengaturan'

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const { can } = usePermission()
const boleh = computed(() => can('master_data', 'EDIT') && can('master_data', 'CREATE'))

const tahunIni = new Date().getFullYear()
const tahun = ref(tahunIni)
const opsiTahun = [tahunIni - 1, tahunIni, tahunIni + 1, tahunIni + 2]

const awal = ref([])
const daftar = ref([])
const rusak = ref(false)
const ada = ref(false)
const memuat = ref(true)
const galat = ref('')
const sukses = ref('')
const galatTambah = ref('')
const sibuk = ref(false)
const tanggalBaru = ref('')

const kunci = computed(() => `libur_${tahun.value}`)
const berubah = computed(() => serialisasiLibur(daftar.value) !== serialisasiLibur(awal.value))

async function muat() {
  memuat.value = true
  galat.value = ''
  try {
    const { data, error } = await supabase.from('pengaturan').select('kunci, nilai').in('kunci', [kunci.value])
    if (error) throw error
    const baris = (data ?? [])[0]
    ada.value = !!baris
    const hasil = parseLibur(baris?.nilai)
    rusak.value = hasil.rusak
    awal.value = hasil.daftar
    daftar.value = [...hasil.daftar]
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    memuat.value = false
  }
}
onMounted(muat)
watch(tahun, () => {
  sukses.value = ''
  galatTambah.value = ''
  muat()
})

function tambah() {
  const hasil = tambahLibur(daftar.value, tanggalBaru.value, tahun.value)
  galatTambah.value = hasil.galat
  if (!hasil.galat) {
    daftar.value = hasil.daftar
    tanggalBaru.value = ''
  }
}
const hapus = (t) => {
  daftar.value = hapusLibur(daftar.value, t)
}
const batal = () => {
  daftar.value = [...awal.value]
  galatTambah.value = ''
}

async function simpan() {
  galat.value = ''
  sukses.value = ''
  sibuk.value = true
  try {
    const { data, error } = await supabase
      .from('pengaturan')
      .upsert({ kunci: kunci.value, nilai: serialisasiLibur(daftar.value) }, { onConflict: 'kunci' })
      .select('kunci')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    sukses.value = `Daftar hari libur ${tahun.value} tersimpan.`
    await muat()
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    sibuk.value = false
  }
}
</script>

<template>
  <p class="max-w-prose text-sm leading-relaxed text-redup">
    Hari libur nasional dan cuti bersama yang tidak dihitung sebagai hari cuti. Perubahan berlaku untuk pengajuan baru atau yang
    tanggalnya diubah; pengajuan yang sudah ada tidak dihitung ulang. Samakan dengan keputusan bersama menteri yang berlaku.
  </p>

  <div class="mt-4">
    <label for="lb-tahun" class="block text-sm font-medium">Tahun</label>
    <select id="lb-tahun" v-model="tahun" class="mt-1.5 rounded-md border border-garis bg-white px-3 py-2 text-sm">
      <option v-for="t in opsiTahun" :key="t" :value="t">{{ t }}</option>
    </select>
  </div>

  <p v-if="sukses" role="status" class="mt-4 rounded-md bg-sukses-muda px-4 py-2.5 text-sm text-sukses">{{ sukses }}</p>
  <p v-if="galat" role="alert" class="mt-4 rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">{{ galat }}</p>
  <p v-if="rusak" role="alert" class="mt-4 rounded-md bg-waspada-muda px-4 py-3 text-sm text-waspada">
    Nilai pengaturan {{ kunci }} tidak berbentuk larik tanggal sehingga tidak terbaca. Menyimpan daftar di bawah akan menggantinya.
  </p>
  <p v-else-if="!memuat && !ada" class="mt-4 rounded-md bg-waspada-muda px-4 py-3 text-sm text-waspada">
    Belum ada daftar libur untuk {{ tahun }}. Hari libur nasional belum akan dikecualikan sampai Anda menambahkan dan menyimpannya.
  </p>
  <p v-if="!boleh" class="mt-4 rounded-md bg-mist px-4 py-3 text-sm text-redup">Anda hanya dapat melihat daftar ini.</p>

  <p v-if="memuat" class="mt-6 text-sm text-redup">Memuat daftar libur...</p>
  <template v-else>
    <form v-if="boleh" class="mt-4 flex flex-wrap items-end gap-3" @submit.prevent="tambah">
      <div>
        <label for="lb-tanggal" class="block text-sm font-medium">Tambah tanggal libur</label>
        <input id="lb-tanggal" v-model="tanggalBaru" type="date" :min="`${tahun}-01-01`" :max="`${tahun}-12-31`" class="mt-1.5 rounded-md border border-garis bg-white px-3 py-2 text-sm" />
      </div>
      <button type="submit" class="rounded-md border border-barito-700 px-4 py-2 text-sm font-semibold text-barito-800 hover:bg-barito-50">Tambah</button>
    </form>
    <p v-if="galatTambah" role="alert" class="mt-2 text-sm text-bahaya">{{ galatTambah }}</p>

    <ul class="mt-4 max-w-xl divide-y divide-garis rounded-lg border border-garis bg-white text-sm">
      <li v-if="daftar.length === 0" class="px-4 py-6 text-center text-redup">Belum ada tanggal libur.</li>
      <li v-for="t in daftar" :key="t" class="flex items-center justify-between gap-3 px-4 py-2.5">
        <span>
          {{ tanggalPanjang(t) }}
          <span class="text-redup">({{ namaHari(t) }})</span>
          <span v-if="akhirPekan(t)" class="ml-1 text-xs text-redup">jatuh pada akhir pekan, tidak berpengaruh</span>
        </span>
        <button v-if="boleh" type="button" class="text-bahaya hover:underline" :aria-label="`Hapus ${tanggalPanjang(t)}`" @click="hapus(t)">Hapus</button>
      </li>
    </ul>

    <div v-if="boleh" class="mt-4 flex items-center gap-3">
      <button type="button" class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60" :disabled="(!berubah && !rusak) || sibuk" @click="simpan">
        {{ sibuk ? 'Menyimpan...' : 'Simpan daftar libur' }}
      </button>
      <button type="button" class="rounded-md border border-garis px-4 py-2 text-sm hover:bg-mist disabled:opacity-60" :disabled="!berubah || sibuk" @click="batal">Batalkan</button>
      <span v-if="berubah" class="text-sm text-redup">Ada perubahan yang belum disimpan</span>
    </div>
  </template>
</template>
