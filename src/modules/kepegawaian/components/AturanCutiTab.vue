<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { bacaAngka } from '../lib/cutiPengaturan'

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const KUNCI = ['def_alokasi_cuti', 'carry_over_enabled', 'carry_over_max']
const { can } = usePermission()
const bolehAturan = computed(() => can('master_data', 'EDIT') && can('master_data', 'CREATE'))
const bolehJenis = computed(() => can('master_data', 'EDIT'))
const bolehJenisBaru = computed(() => can('master_data', 'CREATE'))

const aturan = ref({ def: '12', coAktif: true, coMaks: '999' })
const ditetapkan = ref(false)
const jenis = ref([])
const memuat = ref(true)
const galat = ref('')
const sukses = ref('')
const sibuk = ref('')
const galatAturan = ref('')
const galatJenis = ref('')
const baru = ref({ nama: '', kurangi_tahunan: false, boleh_lebih: true, hari_kalender: false })

const salinJenis = (j) => ({ ...j, asli: { kurangi_tahunan: j.kurangi_tahunan, boleh_lebih: j.boleh_lebih, hari_kalender: j.hari_kalender, aktif: j.aktif } })
const jenisBerubah = (j) =>
  j.kurangi_tahunan !== j.asli.kurangi_tahunan || j.boleh_lebih !== j.asli.boleh_lebih ||
  j.hari_kalender !== j.asli.hari_kalender || j.aktif !== j.asli.aktif

async function muat() {
  memuat.value = true
  galat.value = ''
  try {
    const [p, j] = await Promise.all([
      supabase.from('pengaturan').select('kunci, nilai').in('kunci', KUNCI),
      supabase.from('jenis_cuti').select('nama, kurangi_tahunan, boleh_lebih, hari_kalender, urutan, aktif').order('urutan'),
    ])
    if (p.error) throw p.error
    if (j.error) throw j.error
    const nilai = Object.fromEntries((p.data ?? []).map((x) => [x.kunci, x.nilai]))
    ditetapkan.value = KUNCI.some((k) => k in nilai)
    aturan.value = {
      def: nilai.def_alokasi_cuti ?? '12',
      coAktif: nilai.carry_over_enabled === undefined ? true : nilai.carry_over_enabled !== '0',
      coMaks: nilai.carry_over_max ?? '999',
    }
    jenis.value = (j.data ?? []).map(salinJenis)
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    memuat.value = false
  }
}
onMounted(muat)

async function simpanAturan() {
  galatAturan.value = ''
  sukses.value = ''
  const def = bacaAngka(aturan.value.def)
  const maks = bacaAngka(aturan.value.coMaks)
  if (def.kosong || !def.valid) {
    galatAturan.value = 'Alokasi bawaan: isi dengan bilangan bulat 0 atau lebih.'
    return
  }
  if (maks.kosong || !maks.valid) {
    galatAturan.value = 'Batas sisa tahun lalu: isi dengan bilangan bulat 0 atau lebih (0 berarti tidak ada sisa yang dibawa).'
    return
  }
  sibuk.value = 'aturan'
  try {
    const { data, error } = await supabase
      .from('pengaturan')
      .upsert(
        [
          { kunci: 'def_alokasi_cuti', nilai: String(def.nilai) },
          { kunci: 'carry_over_enabled', nilai: aturan.value.coAktif ? '1' : '0' },
          { kunci: 'carry_over_max', nilai: String(maks.nilai) },
        ],
        { onConflict: 'kunci' }
      )
      .select('kunci')
    if (error) throw error
    if ((data?.length ?? 0) !== 3) throw new Error(TIDAK_TERSIMPAN)
    sukses.value = 'Aturan umum cuti tersimpan.'
    await muat()
  } catch (err) {
    console.error(err)
    galatAturan.value = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}

async function simpanJenis(j) {
  galatJenis.value = ''
  sukses.value = ''
  sibuk.value = `jenis:${j.nama}`
  try {
    const { data, error } = await supabase
      .from('jenis_cuti')
      .update({ kurangi_tahunan: j.kurangi_tahunan, boleh_lebih: j.boleh_lebih, hari_kalender: j.hari_kalender, aktif: j.aktif })
      .eq('nama', j.nama)
      .select('nama')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    sukses.value = `Jenis cuti "${j.nama}" tersimpan.`
    await muat()
  } catch (err) {
    console.error(err)
    galatJenis.value = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}

async function tambahJenis() {
  galatJenis.value = ''
  sukses.value = ''
  const nama = baru.value.nama.trim()
  if (!nama) {
    galatJenis.value = 'Nama jenis cuti wajib diisi.'
    return
  }
  sibuk.value = 'jenis-baru'
  try {
    const urutan = jenis.value.reduce((m, j) => Math.max(m, j.urutan ?? 0), 0) + 1
    const { data, error } = await supabase
      .from('jenis_cuti')
      .insert({ nama, kurangi_tahunan: baru.value.kurangi_tahunan, boleh_lebih: baru.value.boleh_lebih, hari_kalender: baru.value.hari_kalender, urutan, aktif: true })
      .select('nama')
    if (error) {
      if (error.code === '23505') throw new Error('Jenis cuti dengan nama itu sudah ada.')
      throw error
    }
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    baru.value = { nama: '', kurangi_tahunan: false, boleh_lebih: true, hari_kalender: false }
    sukses.value = `Jenis cuti "${nama}" ditambahkan.`
    await muat()
  } catch (err) {
    console.error(err)
    galatJenis.value = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}
</script>

<template>
  <p v-if="galat" role="alert" class="rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">
    Gagal memuat data: {{ galat }} <button type="button" class="ml-2 underline" @click="muat">Coba lagi</button>
  </p>
  <p v-else-if="memuat" class="text-sm text-redup">Memuat aturan cuti...</p>

  <template v-else>
    <p v-if="sukses" role="status" class="mb-4 rounded-md bg-sukses-muda px-4 py-2.5 text-sm text-sukses">{{ sukses }}</p>

    <section>
      <h2 class="text-lg font-semibold">Aturan umum</h2>
      <p v-if="!ditetapkan" class="mt-1 text-sm text-redup">Belum pernah diatur; nilai di bawah adalah nilai bawaan sistem.</p>
      <p v-if="!bolehAturan" class="mt-2 rounded-md bg-mist px-4 py-3 text-sm text-redup">Anda hanya dapat melihat aturan ini.</p>

      <form class="mt-4 grid max-w-xl gap-4 sm:grid-cols-2" @submit.prevent="simpanAturan">
        <div>
          <label for="at-def" class="block text-sm font-medium">Alokasi bawaan (hari per tahun)</label>
          <input id="at-def" v-model="aturan.def" inputmode="numeric" :disabled="!bolehAturan" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
        </div>
        <div>
          <label for="at-maks" class="block text-sm font-medium">Batas sisa tahun lalu yang dibawa (hari)</label>
          <input id="at-maks" v-model="aturan.coMaks" inputmode="numeric" :disabled="!bolehAturan" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
          <p class="mt-1 text-xs text-redup">0 berarti tidak ada sisa yang dibawa.</p>
        </div>
        <label class="flex items-start gap-2 text-sm sm:col-span-2">
          <input v-model="aturan.coAktif" type="checkbox" :disabled="!bolehAturan" class="mt-0.5 size-4" />
          <span>
            Sisa cuti tahun lalu dibawa ke tahun berikutnya
            <span class="block text-xs text-redup">Bila dimatikan, sisa tahun lalu selalu 0 kecuali ditimpa per pegawai.</span>
          </span>
        </label>
        <div class="sm:col-span-2">
          <p v-if="galatAturan" role="alert" class="mb-3 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ galatAturan }}</p>
          <button v-if="bolehAturan" type="submit" class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60" :disabled="sibuk !== ''">
            {{ sibuk === 'aturan' ? 'Menyimpan...' : 'Simpan aturan umum' }}
          </button>
        </div>
      </form>
    </section>

    <section class="mt-10">
      <h2 class="text-lg font-semibold">Jenis cuti</h2>
      <p class="mt-1 max-w-prose text-sm leading-relaxed text-redup">
        "Mengurangi cuti tahunan" menentukan apakah hari cuti jenis ini dihitung sebagai pemakaian jatah tahunan.
        "Boleh melebihi sisa" menentukan apakah pengajuan dapat melampaui sisa. "Hari kalender" menghitung semua hari, bukan hanya hari kerja.
        Nama jenis tidak dapat diubah; nonaktifkan jenis yang tidak dipakai.
      </p>

      <div class="mt-4 overflow-x-auto rounded-lg border border-garis bg-white">
        <table class="w-full min-w-[40rem] text-left text-sm">
          <thead class="border-b border-garis bg-mist text-redup">
            <tr>
              <th scope="col" class="px-4 py-2.5 font-medium">Jenis cuti</th>
              <th scope="col" class="px-3 py-2.5 text-center font-medium">Mengurangi cuti tahunan</th>
              <th scope="col" class="px-3 py-2.5 text-center font-medium">Boleh melebihi sisa</th>
              <th scope="col" class="px-3 py-2.5 text-center font-medium">Hari kalender</th>
              <th scope="col" class="px-3 py-2.5 text-center font-medium">Aktif</th>
              <th scope="col" class="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-garis">
            <tr v-for="j in jenis" :key="j.nama">
              <td class="px-4 py-2.5 font-medium">{{ j.nama }}</td>
              <td v-for="k in ['kurangi_tahunan', 'boleh_lebih', 'hari_kalender', 'aktif']" :key="k" class="px-3 py-2.5 text-center">
                <input v-model="j[k]" type="checkbox" class="size-4" :disabled="!bolehJenis" :aria-label="`${j.nama}: ${k}`" />
              </td>
              <td class="px-3 py-2.5 text-right">
                <button v-if="bolehJenis" type="button" class="rounded-md bg-barito-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-barito-800 disabled:opacity-50" :disabled="!jenisBerubah(j) || sibuk !== ''" @click="simpanJenis(j)">
                  Simpan
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <form v-if="bolehJenisBaru" class="mt-4 max-w-xl space-y-3 rounded-lg border border-garis bg-white p-4" @submit.prevent="tambahJenis">
        <h3 class="text-sm font-semibold">Tambah jenis cuti</h3>
        <div>
          <label for="jb-nama" class="block text-sm font-medium">Nama</label>
          <input id="jb-nama" v-model="baru.nama" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm" />
        </div>
        <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <label class="flex items-center gap-2"><input v-model="baru.kurangi_tahunan" type="checkbox" class="size-4" /> Mengurangi cuti tahunan</label>
          <label class="flex items-center gap-2"><input v-model="baru.boleh_lebih" type="checkbox" class="size-4" /> Boleh melebihi sisa</label>
          <label class="flex items-center gap-2"><input v-model="baru.hari_kalender" type="checkbox" class="size-4" /> Hari kalender</label>
        </div>
        <button type="submit" class="rounded-md border border-barito-700 px-4 py-2 text-sm font-semibold text-barito-800 hover:bg-barito-50 disabled:opacity-60" :disabled="sibuk !== ''">Tambah</button>
      </form>
      <p v-if="galatJenis" role="alert" class="mt-3 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ galatJenis }}</p>
    </section>
  </template>
</template>
