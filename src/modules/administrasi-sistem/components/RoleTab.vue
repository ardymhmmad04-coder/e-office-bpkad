<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { labelModul, labelAksi } from '@/config/menu'
import { AKSI_URUT, hitungPerubahanMatriks, susunMatriks } from '../lib/pengguna'

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const OPSI_SCOPE = [
  { nilai: '', label: '-' },
  { nilai: 'sendiri', label: 'Sendiri' },
  { nilai: 'unit_kerja', label: 'Unit' },
  { nilai: 'seluruh', label: 'Seluruh' },
]

const { can } = usePermission()
const bolehKelola = computed(() => can('pengguna', 'MANAGE'))

const roles = ref([])
const permissions = ref([])
const memuat = ref(true)
const galat = ref('')

const terpilihId = ref(null)
const awal = ref(new Map())
const draft = ref(new Map())
const jumlahPengguna = ref(0)
const sibuk = ref('')
const pesan = ref({ matriks: '', role: '', baru: '' })
const sukses = ref('')

const matriks = computed(() => susunMatriks(permissions.value))
const roleTerpilih = computed(() => roles.value.find((r) => r.id === terpilihId.value) ?? null)
const perubahan = computed(() => hitungPerubahanMatriks(awal.value, draft.value))
const adaPerubahan = computed(() => perubahan.value.hapus.length + perubahan.value.simpan.length > 0)

// Hak "kelola pengguna" milik Super Admin dikunci (juga dijaga di database)
const idTerkunci = computed(() => (roleTerpilih.value?.kode === 'super_admin' ? matriks.value.indeks.pengguna?.MANAGE : null))

async function muatMatriks() {
  if (!terpilihId.value) return
  const id = terpilihId.value
  try {
    const [rp, jml] = await Promise.all([
      supabase.from('role_permissions').select('permission_id, data_scope').eq('role_id', id),
      supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role_id', id),
    ])
    if (rp.error) throw rp.error
    if (jml.error) throw jml.error
    if (id !== terpilihId.value) return // pengguna sudah pindah role
    awal.value = new Map((rp.data ?? []).map((x) => [x.permission_id, x.data_scope]))
    draft.value = new Map(awal.value)
    jumlahPengguna.value = jml.count ?? 0
  } catch (err) {
    console.error(err)
    pesan.value.matriks = pesanError(err)
  }
}

async function muatDasar(pilihId) {
  memuat.value = true
  galat.value = ''
  try {
    const [r, p] = await Promise.all([
      supabase.from('roles').select('id, kode, nama, deskripsi, is_system').order('nama'),
      supabase.from('permissions').select('id, modul, aksi'),
    ])
    if (r.error) throw r.error
    if (p.error) throw p.error
    roles.value = r.data ?? []
    permissions.value = p.data ?? []
    terpilihId.value = pilihId ?? terpilihId.value ?? roles.value[0]?.id ?? null
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
  } finally {
    memuat.value = false
  }
}

onMounted(() => muatDasar())
watch(terpilihId, () => {
  pesan.value = { matriks: '', role: '', baru: '' }
  sukses.value = ''
  konfirmasiHapus.value = false
  salinFormRole()
  muatMatriks()
})

function ubahSel(permId, nilai) {
  const salinan = new Map(draft.value)
  if (nilai === '') salinan.delete(permId)
  else salinan.set(permId, nilai)
  draft.value = salinan
}

function batalkan() {
  draft.value = new Map(awal.value)
  pesan.value.matriks = ''
}

async function simpanMatriks() {
  const { hapus, simpan } = perubahan.value
  if (!hapus.length && !simpan.length) return
  sibuk.value = 'matriks'
  pesan.value.matriks = ''
  sukses.value = ''
  try {
    if (hapus.length) {
      const { data, error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', terpilihId.value)
        .in('permission_id', hapus)
        .select('permission_id')
      if (error) throw error
      if ((data?.length ?? 0) !== hapus.length) throw new Error(TIDAK_TERSIMPAN)
    }
    if (simpan.length) {
      const baris = simpan.map((s) => ({ role_id: terpilihId.value, ...s }))
      const { data, error } = await supabase
        .from('role_permissions')
        .upsert(baris, { onConflict: 'role_id,permission_id' })
        .select('permission_id')
      if (error) throw error
      if ((data?.length ?? 0) !== baris.length) throw new Error(TIDAK_TERSIMPAN)
    }
    sukses.value = 'Hak akses role tersimpan. Pengguna yang sedang login perlu memuat ulang halaman.'
  } catch (err) {
    console.error(err)
    pesan.value.matriks = pesanError(err)
  } finally {
    await muatMatriks() // selalu tampilkan kondisi sebenarnya di database
    sibuk.value = ''
  }
}

// ----- Nama/deskripsi role -----
const formRole = ref({ nama: '', deskripsi: '' })
function salinFormRole() {
  formRole.value = { nama: roleTerpilih.value?.nama ?? '', deskripsi: roleTerpilih.value?.deskripsi ?? '' }
}

async function simpanRole() {
  if (!formRole.value.nama.trim()) {
    pesan.value.role = 'Nama role wajib diisi.'
    return
  }
  sibuk.value = 'role'
  pesan.value.role = ''
  sukses.value = ''
  try {
    const { data, error } = await supabase
      .from('roles')
      .update({ nama: formRole.value.nama.trim(), deskripsi: formRole.value.deskripsi.trim() || null })
      .eq('id', terpilihId.value)
      .select('id')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    await muatDasar(terpilihId.value)
    salinFormRole()
    sukses.value = 'Data role tersimpan.'
  } catch (err) {
    console.error(err)
    pesan.value.role = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}

// ----- Role baru -----
const tampilBaru = ref(false)
const formBaru = ref({ kode: '', nama: '', deskripsi: '' })

async function buatRole() {
  const kode = formBaru.value.kode.trim()
  if (!/^[a-z][a-z0-9_]*$/.test(kode)) {
    pesan.value.baru = 'Kode hanya boleh huruf kecil, angka, dan garis bawah, dan diawali huruf (contoh: operator_arsip).'
    return
  }
  if (!formBaru.value.nama.trim()) {
    pesan.value.baru = 'Nama role wajib diisi.'
    return
  }
  sibuk.value = 'baru'
  pesan.value.baru = ''
  try {
    const { data, error } = await supabase
      .from('roles')
      .insert({ kode, nama: formBaru.value.nama.trim(), deskripsi: formBaru.value.deskripsi.trim() || null })
      .select('id')
      .maybeSingle()
    if (error) {
      if (error.code === '23505') throw new Error('Kode role tersebut sudah dipakai.')
      throw error
    }
    if (!data) throw new Error(TIDAK_TERSIMPAN)
    formBaru.value = { kode: '', nama: '', deskripsi: '' }
    tampilBaru.value = false
    await muatDasar(data.id)
    sukses.value = 'Role baru dibuat. Atur hak aksesnya di matriks di bawah.'
  } catch (err) {
    console.error(err)
    pesan.value.baru = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}

// ----- Hapus role -----
const konfirmasiHapus = ref(false)

async function hapusRole() {
  sibuk.value = 'hapus'
  pesan.value.role = ''
  try {
    const { data, error } = await supabase.from('roles').delete().eq('id', terpilihId.value).select('id')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    konfirmasiHapus.value = false
    terpilihId.value = null
    await muatDasar()
    sukses.value = 'Role dihapus.'
  } catch (err) {
    console.error(err)
    pesan.value.role = pesanError(err)
  } finally {
    sibuk.value = ''
  }
}

const sedangSibuk = computed(() => sibuk.value !== '')
</script>

<template>
  <p v-if="galat" role="alert" class="rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">
    Gagal memuat data: {{ galat }}
    <button type="button" class="ml-2 underline" @click="muatDasar()">Coba lagi</button>
  </p>
  <p v-else-if="memuat" class="text-sm text-redup">Memuat role...</p>

  <div v-else class="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
    <!-- Daftar role -->
    <div>
      <ul class="space-y-1" aria-label="Daftar role">
        <li v-for="r in roles" :key="r.id">
          <button
            type="button"
            :aria-current="r.id === terpilihId ? 'true' : undefined"
            :class="[
              'w-full rounded-md border-l-[3px] px-3 py-2 text-left text-sm',
              r.id === terpilihId ? 'border-emas bg-white font-medium shadow-sm' : 'border-transparent hover:bg-white/70',
            ]"
            @click="terpilihId = r.id"
          >
            {{ r.nama }}
            <span v-if="r.is_system" class="block text-xs font-normal text-redup">Bawaan</span>
          </button>
        </li>
      </ul>

      <template v-if="bolehKelola">
        <button v-if="!tampilBaru" type="button" class="mt-4 text-sm font-medium text-barito-700 hover:underline" @click="tampilBaru = true">
          Tambah role
        </button>
        <form v-else class="mt-4 space-y-2 rounded-lg border border-garis bg-white p-3" @submit.prevent="buatRole">
          <div>
            <label for="rb-kode" class="block text-xs font-medium">Kode</label>
            <input id="rb-kode" v-model="formBaru.kode" placeholder="operator_arsip" class="mt-1 w-full rounded-md border border-garis px-2.5 py-1.5 text-sm" />
          </div>
          <div>
            <label for="rb-nama" class="block text-xs font-medium">Nama</label>
            <input id="rb-nama" v-model="formBaru.nama" class="mt-1 w-full rounded-md border border-garis px-2.5 py-1.5 text-sm" />
          </div>
          <div>
            <label for="rb-desk" class="block text-xs font-medium">Deskripsi</label>
            <textarea id="rb-desk" v-model="formBaru.deskripsi" rows="2" class="mt-1 w-full rounded-md border border-garis px-2.5 py-1.5 text-sm"></textarea>
          </div>
          <p v-if="pesan.baru" role="alert" class="rounded-md bg-bahaya-muda px-2.5 py-1.5 text-xs text-bahaya">{{ pesan.baru }}</p>
          <div class="flex gap-2">
            <button type="submit" class="rounded-md bg-barito-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60" :disabled="sedangSibuk">
              Buat role
            </button>
            <button type="button" class="rounded-md border border-garis px-3 py-1.5 text-sm hover:bg-mist" @click="tampilBaru = false">Batal</button>
          </div>
        </form>
      </template>
    </div>

    <!-- Detail role -->
    <div v-if="roleTerpilih" class="min-w-0">
      <p v-if="sukses" role="status" class="mb-4 rounded-md bg-sukses-muda px-4 py-2.5 text-sm text-sukses">{{ sukses }}</p>

      <section class="rounded-lg border border-garis bg-white p-4">
        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="simpanRole">
          <div>
            <label for="rt-nama" class="block text-sm font-medium">Nama role</label>
            <input id="rt-nama" v-model="formRole.nama" :disabled="!bolehKelola" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
          </div>
          <div>
            <p class="text-sm font-medium">Kode</p>
            <p class="mt-1 rounded-md bg-mist px-3 py-2 font-mono text-sm">{{ roleTerpilih.kode }}</p>
          </div>
          <div class="sm:col-span-2">
            <label for="rt-desk" class="block text-sm font-medium">Deskripsi</label>
            <textarea id="rt-desk" v-model="formRole.deskripsi" rows="2" :disabled="!bolehKelola" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist"></textarea>
          </div>
          <div class="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button v-if="bolehKelola" type="submit" class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60" :disabled="sedangSibuk">
              Simpan data role
            </button>
            <span class="text-sm text-redup">Dipakai {{ jumlahPengguna }} pengguna</span>

            <template v-if="bolehKelola && !roleTerpilih.is_system">
              <button v-if="!konfirmasiHapus" type="button" class="ml-auto text-sm text-bahaya hover:underline" @click="konfirmasiHapus = true">
                Hapus role
              </button>
              <span v-else class="ml-auto flex items-center gap-2 text-sm">
                <span class="text-bahaya">
                  Hapus role ini{{ jumlahPengguna ? ` dan lepas dari ${jumlahPengguna} pengguna` : '' }}?
                </span>
                <button type="button" class="rounded-md bg-bahaya px-3 py-1.5 font-semibold text-white disabled:opacity-60" :disabled="sedangSibuk" @click="hapusRole">Ya, hapus</button>
                <button type="button" class="rounded-md border border-garis px-3 py-1.5 hover:bg-mist" @click="konfirmasiHapus = false">Batal</button>
              </span>
            </template>
          </div>
        </form>
        <p v-if="pesan.role" role="alert" class="mt-3 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ pesan.role }}</p>
      </section>

      <section class="mt-6">
        <h2 class="text-lg font-semibold">Hak akses role</h2>
        <p class="mt-1 max-w-prose text-sm leading-relaxed text-redup">
          Sendiri: data milik pengguna. Unit: unit pengguna beserta semua unit di bawahnya. Seluruh: seluruh BPKAD.
          "Kelola penuh" mencakup semua tindakan kecuali "Setujui".
        </p>

        <div class="mt-3 overflow-x-auto rounded-lg border border-garis bg-white">
          <table class="w-full min-w-[56rem] text-left text-sm">
            <thead class="border-b border-garis bg-mist text-xs text-redup">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">Modul</th>
                <th v-for="a in AKSI_URUT" :key="a" scope="col" class="px-1.5 py-2 text-center font-medium">{{ labelAksi[a] }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-garis">
              <tr v-for="m in matriks.modul" :key="m">
                <th scope="row" class="px-3 py-1.5 font-medium">{{ labelModul[m] ?? m }}</th>
                <td v-for="a in AKSI_URUT" :key="a" class="px-1.5 py-1.5">
                  <select
                    v-if="matriks.indeks[m][a]"
                    :aria-label="`${labelModul[m] ?? m}: ${labelAksi[a]}`"
                    :value="draft.get(matriks.indeks[m][a]) ?? ''"
                    :disabled="!bolehKelola || sedangSibuk || matriks.indeks[m][a] === idTerkunci"
                    :title="matriks.indeks[m][a] === idTerkunci ? 'Dikunci agar Super Admin tidak kehilangan akses' : undefined"
                    :class="[
                      'w-full rounded border px-1 py-1 text-xs disabled:opacity-70',
                      (draft.get(matriks.indeks[m][a]) ?? '') !== (awal.get(matriks.indeks[m][a]) ?? '')
                        ? 'border-emas bg-emas-muda'
                        : 'border-garis bg-white',
                    ]"
                    @change="ubahSel(matriks.indeks[m][a], $event.target.value)"
                  >
                    <option v-for="o in OPSI_SCOPE" :key="o.nilai" :value="o.nilai">{{ o.label }}</option>
                  </select>
                  <span v-else class="block text-center text-redup/50" aria-hidden="true">.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="pesan.matriks" role="alert" class="mt-3 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ pesan.matriks }}</p>

        <div v-if="bolehKelola" class="mt-4 flex items-center gap-3">
          <button type="button" class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60" :disabled="!adaPerubahan || sedangSibuk" @click="simpanMatriks">
            {{ sibuk === 'matriks' ? 'Menyimpan...' : 'Simpan perubahan' }}
          </button>
          <button type="button" class="rounded-md border border-garis px-4 py-2 text-sm hover:bg-mist disabled:opacity-60" :disabled="!adaPerubahan || sedangSibuk" @click="batalkan">
            Batalkan
          </button>
          <span v-if="adaPerubahan" class="text-sm text-redup">
            {{ perubahan.simpan.length + perubahan.hapus.length }} perubahan belum disimpan
          </span>
        </div>
      </section>
    </div>
  </div>
</template>
