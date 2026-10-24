<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { PER_HALAMAN, ambilHalaman, labelNomorInduk } from '../lib/pegawai'
import { bacaAngka } from '../lib/cutiPengaturan'

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const { can } = usePermission()
const boleh = computed(() => can('cuti', 'PROCESS'))

const tahunIni = new Date().getFullYear()
const tahun = ref(tahunIni)
const opsiTahun = [tahunIni - 1, tahunIni, tahunIni + 1]

const baris = ref([])
const edit = ref({}) // pegawai_id -> { alokasi, override }
const memuat = ref(true)
const galat = ref('')
const sukses = ref('')
const sibuk = ref('')
const cari = ref('')
const halaman = ref(1)

async function muat() {
  memuat.value = true
  galat.value = ''
  try {
    const { data, error } = await supabase.rpc('rekap_sisa_cuti', { p_tahun: tahun.value })
    if (error) throw error
    baris.value = data ?? []
    edit.value = Object.fromEntries(
      baris.value.map((r) => [r.pegawai_id, { alokasi: String(r.alokasi), override: r.carryover_override === null ? '' : String(r.carryover_override) }])
    )
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
  halaman.value = 1
  muat()
})
watch(cari, () => {
  halaman.value = 1
})

const tersaring = computed(() => {
  const k = cari.value.trim().toLowerCase()
  return baris.value.filter((r) => !k || `${r.nama} ${r.nomor_induk}`.toLowerCase().includes(k))
})
const hal = computed(() => ambilHalaman(tersaring.value, halaman.value))

const berubah = (r) => {
  const e = edit.value[r.pegawai_id]
  return !!e && (e.alokasi.trim() !== String(r.alokasi) || e.override.trim() !== (r.carryover_override === null ? '' : String(r.carryover_override)))
}

async function simpan(r) {
  galat.value = ''
  sukses.value = ''
  const e = edit.value[r.pegawai_id]
  const al = bacaAngka(e.alokasi)
  const ov = bacaAngka(e.override)
  if (al.kosong || !al.valid) {
    galat.value = `Alokasi ${r.nama}: isi dengan bilangan bulat 0 atau lebih.`
    return
  }
  if (!ov.valid) {
    galat.value = `Sisa tahun lalu ${r.nama}: kosongkan (otomatis) atau isi bilangan bulat 0 atau lebih.`
    return
  }
  sibuk.value = r.pegawai_id
  try {
    const { data, error } = await supabase
      .from('alokasi_cuti')
      .upsert({ pegawai_id: r.pegawai_id, tahun: tahun.value, alokasi: al.nilai, carryover_override: ov.nilai }, { onConflict: 'pegawai_id,tahun' })
      .select('pegawai_id')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    sukses.value = `Alokasi ${r.nama} tahun ${tahun.value} tersimpan.`
    await muat()
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}

async function kembalikan(r) {
  galat.value = ''
  sukses.value = ''
  sibuk.value = r.pegawai_id
  try {
    const { data, error } = await supabase
      .from('alokasi_cuti')
      .delete()
      .eq('pegawai_id', r.pegawai_id)
      .eq('tahun', tahun.value)
      .select('pegawai_id')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    sukses.value = `Pengaturan khusus ${r.nama} dihapus; kembali memakai alokasi bawaan.`
    await muat()
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}
</script>

<template>
  <p class="max-w-prose text-sm leading-relaxed text-redup">
    Alokasi cuti tahunan per pegawai. Pegawai tanpa pengaturan khusus memakai alokasi bawaan (tab Aturan umum).
    "Sisa tahun lalu" dihitung otomatis; isi hanya untuk menimpa angkanya bagi pegawai tertentu (0 berarti tidak ada sisa).
  </p>

  <div class="mt-4 flex flex-wrap items-end gap-3">
    <div>
      <label for="al-tahun" class="block text-sm font-medium">Tahun</label>
      <select id="al-tahun" v-model="tahun" class="mt-1.5 rounded-md border border-garis bg-white px-3 py-2 text-sm">
        <option v-for="t in opsiTahun" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>
    <div class="min-w-0 flex-1 basis-56">
      <label for="al-cari" class="block text-sm font-medium">Cari pegawai</label>
      <input id="al-cari" v-model="cari" type="search" placeholder="Nama atau nomor induk" class="mt-1.5 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm" />
    </div>
  </div>

  <p v-if="sukses" role="status" class="mt-4 rounded-md bg-sukses-muda px-4 py-2.5 text-sm text-sukses">{{ sukses }}</p>
  <p v-if="galat" role="alert" class="mt-4 rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">{{ galat }}</p>
  <p v-if="!boleh" class="mt-4 rounded-md bg-mist px-4 py-3 text-sm text-redup">Anda hanya dapat melihat alokasi.</p>

  <p v-if="memuat" class="mt-6 text-sm text-redup">Memuat rekap cuti...</p>
  <div v-else class="mt-4 overflow-x-auto rounded-lg border border-garis bg-white">
    <table class="w-full min-w-[52rem] text-left text-sm">
      <thead class="border-b border-garis bg-mist text-redup">
        <tr>
          <th scope="col" class="px-4 py-2.5 font-medium">Pegawai</th>
          <th scope="col" class="px-3 py-2.5 font-medium">Alokasi (hari)</th>
          <th scope="col" class="px-3 py-2.5 font-medium">Sisa tahun lalu</th>
          <th scope="col" class="px-3 py-2.5 text-right font-medium">Terpakai</th>
          <th scope="col" class="px-3 py-2.5 text-right font-medium">Sisa</th>
          <th scope="col" class="px-3 py-2.5 text-right font-medium">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-garis">
        <tr v-if="hal.baris.length === 0">
          <td colspan="6" class="px-4 py-8 text-center text-redup">Tidak ada pegawai yang cocok.</td>
        </tr>
        <tr v-for="r in hal.baris" :key="r.pegawai_id">
          <td class="px-4 py-2.5">
            <p class="font-medium">{{ r.nama }}</p>
            <p class="text-xs text-redup">{{ labelNomorInduk[r.jenis] }} {{ r.nomor_induk }}<span v-if="!r.punya_alokasi"> | bawaan</span></p>
          </td>
          <td class="px-3 py-2.5">
            <input v-model="edit[r.pegawai_id].alokasi" :aria-label="`Alokasi ${r.nama}`" inputmode="numeric" :disabled="!boleh" class="w-20 rounded-md border border-garis px-2 py-1.5 text-sm disabled:bg-mist" />
          </td>
          <td class="px-3 py-2.5">
            <input v-model="edit[r.pegawai_id].override" :aria-label="`Sisa tahun lalu ${r.nama}`" inputmode="numeric" :placeholder="`otomatis (${r.carryover})`" :disabled="!boleh" class="w-28 rounded-md border border-garis px-2 py-1.5 text-sm disabled:bg-mist" />
          </td>
          <td class="px-3 py-2.5 text-right tabular-nums">{{ r.terpakai }}</td>
          <td class="px-3 py-2.5 text-right font-medium tabular-nums">{{ r.sisa }}</td>
          <td class="px-3 py-2.5">
            <div v-if="boleh" class="flex items-center justify-end gap-2">
              <button type="button" class="rounded-md bg-barito-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-barito-800 disabled:opacity-50" :disabled="!berubah(r) || sibuk !== ''" @click="simpan(r)">
                {{ sibuk === r.pegawai_id ? 'Menyimpan...' : 'Simpan' }}
              </button>
              <button v-if="r.punya_alokasi" type="button" class="text-xs text-bahaya hover:underline disabled:opacity-50" :disabled="sibuk !== ''" @click="kembalikan(r)">Bawaan</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="!memuat && hal.jumlahHalaman > 1" class="mt-3 flex items-center justify-between text-sm">
    <p class="text-redup">{{ (hal.halaman - 1) * PER_HALAMAN + 1 }}-{{ Math.min(hal.halaman * PER_HALAMAN, hal.total) }} dari {{ hal.total }}</p>
    <div class="flex items-center gap-2">
      <button type="button" class="rounded-md border border-garis bg-white px-3 py-1.5 hover:bg-mist disabled:opacity-50" :disabled="hal.halaman <= 1" @click="halaman = hal.halaman - 1">Sebelumnya</button>
      <span class="text-redup">Halaman {{ hal.halaman }} dari {{ hal.jumlahHalaman }}</span>
      <button type="button" class="rounded-md border border-garis bg-white px-3 py-1.5 hover:bg-mist disabled:opacity-50" :disabled="hal.halaman >= hal.jumlahHalaman" @click="halaman = hal.halaman + 1">Berikutnya</button>
    </div>
  </div>
</template>
