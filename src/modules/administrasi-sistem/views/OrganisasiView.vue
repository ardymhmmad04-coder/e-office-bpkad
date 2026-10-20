<script setup>
import { computed, onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, Plus } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { ratakanUnit } from '../lib/pengguna'
import { geserUrutan } from '../lib/organisasi'
import UnitEditor from '../components/UnitEditor.vue'

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const { can } = usePermission()
const bolehTambah = computed(() => can('organisasi', 'CREATE'))
const bolehUbah = computed(() => can('organisasi', 'EDIT'))

const units = ref([])
const ringkasan = ref(new Map())
const memuat = ref(true)
const galat = ref('')
const galatAksi = ref('')
const sukses = ref('')
const sibuk = ref(false)
const editor = ref(null) // { unit: object|null, parentId: string|null }

async function muat() {
  memuat.value = true
  galat.value = ''
  try {
    const [u, r] = await Promise.all([
      supabase.from('unit_kerja').select('id, kode, nama, parent_id, urutan, aktif'),
      supabase.rpc('ringkasan_unit'),
    ])
    if (u.error) throw u.error
    if (r.error) throw r.error
    units.value = u.data ?? []
    ringkasan.value = new Map((r.data ?? []).map((x) => [x.unit_id, x]))
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    memuat.value = false
  }
}
onMounted(muat)

const daftar = computed(() => ratakanUnit(units.value))
const jumlah = (id, kolom) => Number(ringkasan.value.get(id)?.[kolom] ?? 0)

async function geser(unit, arah) {
  const perubahan = geserUrutan(units.value, unit.id, arah)
  if (!perubahan.length) return
  sibuk.value = true
  galatAksi.value = ''
  sukses.value = ''
  try {
    const hasil = await Promise.all(
      perubahan.map((p) => supabase.from('unit_kerja').update({ urutan: p.urutan }).eq('id', p.id).select('id'))
    )
    for (const h of hasil) {
      if (h.error) throw h.error
      if (!h.data?.length) throw new Error(TIDAK_TERSIMPAN)
    }
  } catch (err) {
    console.error(err)
    galatAksi.value = pesanError(err)
  } finally {
    await muat() // selalu tampilkan urutan yang sebenarnya
    sibuk.value = false
  }
}

function bukaBaru(parentId = null) {
  editor.value = { unit: null, parentId }
}
function bukaUbah(unit) {
  editor.value = { unit, parentId: null }
}
function setelahTersimpan(pesan) {
  sukses.value = pesan
  galatAksi.value = ''
  muat()
}

const adaUnit = computed(() => units.value.length > 0)
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">Struktur organisasi</h1>
      <p class="mt-2 max-w-prose text-sm leading-relaxed text-redup">
        Hierarki unit kerja. Cakupan data "unit kerja" mengikuti struktur ini dan mencakup unit di bawahnya,
        jadi tempatkan Kepala BPKAD di unit teratas agar melihat seluruh BPKAD.
      </p>
    </div>
    <button
      v-if="bolehTambah"
      type="button"
      class="flex items-center gap-1.5 rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800"
      @click="bukaBaru(null)"
    >
      <Plus :size="16" />
      Tambah unit
    </button>
  </div>

  <p v-if="sukses" role="status" class="mt-5 rounded-md bg-sukses-muda px-4 py-2.5 text-sm text-sukses">{{ sukses }}</p>
  <p v-if="galatAksi" role="alert" class="mt-5 rounded-md bg-bahaya-muda px-4 py-2.5 text-sm text-bahaya">{{ galatAksi }}</p>

  <p v-if="galat" role="alert" class="mt-6 rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">
    Gagal memuat data: {{ galat }}
    <button type="button" class="ml-2 underline" @click="muat">Coba lagi</button>
  </p>
  <p v-else-if="memuat" class="mt-6 text-sm text-redup">Memuat struktur organisasi...</p>
  <p v-else-if="!adaUnit" class="mt-6 rounded-md border border-garis bg-white px-4 py-6 text-sm text-redup">
    Belum ada unit. Tambahkan unit teratas (misalnya nama instansi), lalu sub unit di bawahnya.
  </p>

  <div v-else class="mt-6 overflow-x-auto rounded-lg border border-garis bg-white">
    <table class="w-full min-w-[44rem] text-left text-sm">
      <thead class="border-b border-garis bg-mist text-redup">
        <tr>
          <th scope="col" class="px-4 py-2.5 font-medium">Unit</th>
          <th scope="col" class="px-3 py-2.5 text-right font-medium">Akun</th>
          <th scope="col" class="px-3 py-2.5 text-right font-medium">Pegawai</th>
          <th scope="col" class="px-3 py-2.5 font-medium">Status</th>
          <th scope="col" class="px-3 py-2.5 text-right font-medium">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-garis">
        <tr v-for="u in daftar" :key="u.id">
          <td class="py-2.5 pr-3" :style="{ paddingLeft: `${1 + u.depth * 1.5}rem` }">
            <p :class="u.depth === 0 ? 'font-semibold' : 'font-medium'">{{ u.nama }}</p>
            <p v-if="u.kode" class="text-xs text-redup">Kode: {{ u.kode }}</p>
          </td>
          <td class="px-3 py-2.5 text-right tabular-nums">{{ jumlah(u.id, 'jumlah_akun') }}</td>
          <td class="px-3 py-2.5 text-right tabular-nums">{{ jumlah(u.id, 'jumlah_pegawai') }}</td>
          <td class="px-3 py-2.5">
            <span :class="['inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', u.aktif ? 'bg-sukses-muda text-sukses' : 'bg-mist text-redup']">
              {{ u.aktif ? 'Aktif' : 'Nonaktif' }}
            </span>
          </td>
          <td class="px-3 py-2.5">
            <div class="flex items-center justify-end gap-1">
              <template v-if="bolehUbah">
                <button type="button" class="rounded p-1.5 hover:bg-mist disabled:opacity-50" :disabled="sibuk" :aria-label="`Naikkan ${u.nama}`" @click="geser(u, 'naik')">
                  <ArrowUp :size="16" />
                </button>
                <button type="button" class="rounded p-1.5 hover:bg-mist disabled:opacity-50" :disabled="sibuk" :aria-label="`Turunkan ${u.nama}`" @click="geser(u, 'turun')">
                  <ArrowDown :size="16" />
                </button>
              </template>
              <button v-if="bolehTambah" type="button" class="rounded px-2 py-1 text-barito-700 hover:bg-mist" @click="bukaBaru(u.id)">Sub unit</button>
              <button type="button" class="rounded px-2 py-1 text-barito-700 hover:bg-mist" @click="bukaUbah(u)">
                {{ bolehUbah ? 'Ubah' : 'Lihat' }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <UnitEditor
    v-if="editor"
    :unit="editor.unit"
    :parent-id="editor.parentId"
    :semua-unit="units"
    :ringkasan="editor.unit ? ringkasan.get(editor.unit.id) ?? null : null"
    @tutup="editor = null"
    @tersimpan="setelahTersimpan"
  />
</template>
