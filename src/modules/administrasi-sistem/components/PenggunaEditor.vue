<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { labelModul, labelAksi, labelScope } from '@/config/menu'
import { AKSI_URUT, SCOPE_URUT, ringkasHak } from '../lib/pengguna'

const props = defineProps({
  userId: { type: String, required: true },
  unit: { type: Array, default: () => [] },
  peran: { type: Array, default: () => [] },
})
const emit = defineEmits(['tutup', 'berubah'])

const { can } = usePermission()
const bolehUbahProfil = computed(() => can('pengguna', 'EDIT'))
const bolehKelola = computed(() => can('pengguna', 'MANAGE'))

const memuat = ref(true)
const galatMuat = ref('')
const profil = ref(null)
const form = ref({ nama: '', nip: '', jabatan: '', no_wa: '', unit_kerja_id: '', aktif: true })
const roleDimiliki = ref(new Set())
const hakTambahan = ref([])
const semuaPermission = ref([])
const hakEfektif = ref([])
const pegawaiPilihan = ref([])

const pesan = ref({ profil: '', tautan: '', role: '', hak: '' })
const sukses = ref('')
const sibuk = ref('')
const versi = ref(0) // dinaikkan setelah gagal agar kotak centang ikut kembali ke kondisi sebenarnya

async function muatDetail() {
  const id = props.userId
  const [pf, ur, up, pm, hk] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nip, nama, email, jabatan, no_wa, aktif, unit_kerja_id, pegawai_id')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('user_roles').select('role_id').eq('user_id', id),
    supabase.from('user_permissions').select('permission_id, data_scope, permissions(modul, aksi)').eq('user_id', id),
    supabase.from('permissions').select('id, modul, aksi'),
    supabase.rpc('hak_efektif', { p_user: id }),
  ])
  for (const h of [pf, ur, up, pm, hk]) if (h.error) throw h.error
  if (!pf.data) throw new Error('Akun tidak ditemukan.')

  profil.value = pf.data
  form.value = {
    nama: pf.data.nama ?? '',
    nip: pf.data.nip ?? '',
    jabatan: pf.data.jabatan ?? '',
    no_wa: pf.data.no_wa ?? '',
    unit_kerja_id: pf.data.unit_kerja_id ?? '',
    aktif: pf.data.aktif,
  }
  roleDimiliki.value = new Set((ur.data ?? []).map((x) => x.role_id))
  hakTambahan.value = up.data ?? []
  semuaPermission.value = pm.data ?? []
  hakEfektif.value = hk.data ?? []

  if (bolehUbahProfil.value) {
    const pg = await supabase.rpc('daftar_pegawai_untuk_tautan', { p_profile: id })
    if (pg.error) throw pg.error
    pegawaiPilihan.value = pg.data ?? []
  }
}

async function muatAwal() {
  memuat.value = true
  galatMuat.value = ''
  try {
    await muatDetail()
  } catch (err) {
    console.error(err)
    galatMuat.value = pesanError(err)
  } finally {
    memuat.value = false
  }
}
onMounted(muatAwal)
watch(() => props.userId, muatAwal)

// Menjalankan satu aksi, lalu memuat ulang data. Galat selalu ditampilkan di bagian terkait.
async function jalankan(kunci, bagian, aksi, pesanOk) {
  sibuk.value = kunci
  pesan.value[bagian] = ''
  sukses.value = ''
  try {
    await aksi()
    await muatDetail()
    emit('berubah')
    if (pesanOk) sukses.value = pesanOk
  } catch (err) {
    console.error(err)
    pesan.value[bagian] = pesanError(err)
    try {
      await muatDetail()
    } catch (e) {
      console.error(e)
    }
    versi.value++
  } finally {
    sibuk.value = ''
  }
}

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'

// ----- Data akun -----
function simpanProfil() {
  if (!form.value.nama.trim()) {
    pesan.value.profil = 'Nama wajib diisi.'
    return
  }
  return jalankan('profil', 'profil', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        nama: form.value.nama.trim(),
        nip: form.value.nip.trim() || null,
        jabatan: form.value.jabatan.trim() || null,
        no_wa: form.value.no_wa.trim() || null,
        unit_kerja_id: form.value.unit_kerja_id || null,
        aktif: form.value.aktif,
      })
      .eq('id', props.userId)
      .select('id')
    if (error) {
      if (error.code === '23505') throw new Error('NIP tersebut sudah dipakai akun lain.')
      throw error
    }
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
  }, 'Data akun tersimpan.')
}

// ----- Tautan ke data pegawai -----
const cariPegawai = ref('')
const pegawaiTerpilih = ref('')
const tertaut = computed(() => pegawaiPilihan.value.find((p) => p.tertaut_ke_ini))
const belumTertaut = computed(() => {
  const k = cariPegawai.value.trim().toLowerCase()
  return pegawaiPilihan.value
    .filter((p) => !p.tertaut_ke_ini)
    .filter((p) => !k || `${p.nama} ${p.nomor_induk}`.toLowerCase().includes(k))
})

function tautkan() {
  if (!pegawaiTerpilih.value) {
    pesan.value.tautan = 'Pilih pegawai terlebih dahulu.'
    return
  }
  return jalankan('tautan', 'tautan', async () => {
    const { error } = await supabase.rpc('tautkan_akun_pegawai', {
      p_profile: props.userId,
      p_pegawai: pegawaiTerpilih.value,
    })
    if (error) throw error
    pegawaiTerpilih.value = ''
  }, 'Akun ditautkan. NIP, unit kerja, dan jabatan disalin dari data pegawai.')
}

function lepasTautan() {
  return jalankan('tautan', 'tautan', async () => {
    const { error } = await supabase.rpc('lepas_tautan_akun', { p_profile: props.userId })
    if (error) throw error
  }, 'Tautan dilepas.')
}

// ----- Role -----
function ubahRole(role, pilih) {
  return jalankan('role:' + role.id, 'role', async () => {
    const q = pilih
      ? supabase.from('user_roles').insert({ user_id: props.userId, role_id: role.id }).select('role_id')
      : supabase.from('user_roles').delete().eq('user_id', props.userId).eq('role_id', role.id).select('role_id')
    const { data, error } = await q
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
  })
}

// ----- Hak tambahan -----
const hakBaru = ref({ modul: '', aksi: '', scope: 'sendiri' })
const modulOpsi = computed(() =>
  [...new Set(semuaPermission.value.map((p) => p.modul))].sort((a, b) =>
    (labelModul[a] ?? a).localeCompare(labelModul[b] ?? b, 'id')
  )
)
const aksiOpsi = computed(() =>
  semuaPermission.value
    .filter((p) => p.modul === hakBaru.value.modul)
    .map((p) => p.aksi)
    .sort((a, b) => AKSI_URUT.indexOf(a) - AKSI_URUT.indexOf(b))
)
watch(() => hakBaru.value.modul, () => {
  hakBaru.value.aksi = ''
})

function tambahHak() {
  const p = semuaPermission.value.find((x) => x.modul === hakBaru.value.modul && x.aksi === hakBaru.value.aksi)
  if (!p) {
    pesan.value.hak = 'Pilih modul dan tindakan terlebih dahulu.'
    return
  }
  return jalankan('hak-tambah', 'hak', async () => {
    const { data, error } = await supabase
      .from('user_permissions')
      .insert({ user_id: props.userId, permission_id: p.id, data_scope: hakBaru.value.scope })
      .select('permission_id')
    if (error) {
      if (error.code === '23505') throw new Error('Hak tersebut sudah ada. Hapus dulu bila ingin mengubah cakupannya.')
      throw error
    }
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    hakBaru.value = { modul: '', aksi: '', scope: 'sendiri' }
  }, 'Hak tambahan ditambahkan.')
}

function hapusHak(baris) {
  return jalankan('hak:' + baris.permission_id, 'hak', async () => {
    const { data, error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', props.userId)
      .eq('permission_id', baris.permission_id)
      .select('permission_id')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
  }, 'Hak tambahan dihapus.')
}

const ringkasan = computed(() => ringkasHak(hakEfektif.value))
const sedangSibuk = computed(() => sibuk.value !== '')
</script>

<template>
  <div class="fixed inset-0 z-40 bg-ink/40" aria-hidden="true" @click="emit('tutup')"></div>

  <aside
    class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-label="Ubah pengguna"
    @keydown.esc="emit('tutup')"
  >
    <header class="flex items-start justify-between gap-3 border-b border-garis px-5 py-4">
      <div class="min-w-0">
        <h2 class="truncate text-lg font-semibold">{{ profil?.nama ?? 'Pengguna' }}</h2>
        <p class="truncate text-sm text-redup">{{ profil?.email }}</p>
      </div>
      <button type="button" class="rounded p-1.5 hover:bg-mist" aria-label="Tutup" @click="emit('tutup')">
        <X :size="20" />
      </button>
    </header>

    <div class="flex-1 overflow-y-auto px-5 py-5">
      <p v-if="memuat" class="text-sm text-redup">Memuat data...</p>
      <p v-else-if="galatMuat" role="alert" class="rounded-md bg-bahaya-muda px-4 py-3 text-sm text-bahaya">
        Gagal memuat: {{ galatMuat }}
      </p>

      <template v-else>
        <p v-if="sukses" role="status" class="mb-5 rounded-md bg-sukses-muda px-4 py-2.5 text-sm text-sukses">{{ sukses }}</p>

        <!-- Data akun -->
        <section class="border-b border-garis pb-6">
          <h3 class="font-semibold">Data akun</h3>
          <p v-if="!bolehUbahProfil" class="mt-1 text-sm text-redup">Anda hanya dapat melihat data ini.</p>

          <form class="mt-4 grid gap-4 sm:grid-cols-2" @submit.prevent="simpanProfil">
            <div class="sm:col-span-2">
              <label for="ed-nama" class="block text-sm font-medium">Nama</label>
              <input id="ed-nama" v-model="form.nama" :disabled="!bolehUbahProfil" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
            </div>
            <div>
              <label for="ed-nip" class="block text-sm font-medium">NIP / nomor induk</label>
              <input id="ed-nip" v-model="form.nip" :disabled="!bolehUbahProfil" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
            </div>
            <div>
              <label for="ed-wa" class="block text-sm font-medium">Nomor WhatsApp</label>
              <input id="ed-wa" v-model="form.no_wa" :disabled="!bolehUbahProfil" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
            </div>
            <div class="sm:col-span-2">
              <label for="ed-jabatan" class="block text-sm font-medium">Jabatan</label>
              <input id="ed-jabatan" v-model="form.jabatan" :disabled="!bolehUbahProfil" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
            </div>
            <div class="sm:col-span-2">
              <label for="ed-unit" class="block text-sm font-medium">Unit kerja</label>
              <select id="ed-unit" v-model="form.unit_kerja_id" :disabled="!bolehUbahProfil" class="mt-1 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm disabled:bg-mist">
                <option value="">Belum diisi</option>
                <option v-for="u in unit" :key="u.id" :value="u.id">{{ '\u00A0\u00A0'.repeat(u.depth) + u.nama }}</option>
              </select>
              <p class="mt-1 text-xs text-redup">Cakupan "unit kerja" mencakup unit ini beserta semua unit di bawahnya.</p>
            </div>
            <div class="sm:col-span-2">
              <label class="flex items-center gap-2 text-sm">
                <input v-model="form.aktif" type="checkbox" :disabled="!bolehUbahProfil" class="size-4" />
                Akun aktif (akun nonaktif tidak punya hak akses apa pun)
              </label>
            </div>

            <div class="sm:col-span-2">
              <p v-if="pesan.profil" role="alert" class="mb-3 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ pesan.profil }}</p>
              <button
                v-if="bolehUbahProfil"
                type="submit"
                class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60"
                :disabled="sedangSibuk"
              >
                {{ sibuk === 'profil' ? 'Menyimpan...' : 'Simpan data akun' }}
              </button>
            </div>
          </form>
        </section>

        <!-- Tautan pegawai -->
        <section v-if="bolehUbahProfil" class="border-b border-garis py-6">
          <h3 class="font-semibold">Tautan ke data pegawai</h3>
          <p class="mt-1 text-sm text-redup">Menautkan akun ke data pegawai menyalin NIP, unit kerja, dan jabatan ke akun ini.</p>

          <div v-if="tertaut" class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-garis bg-mist px-4 py-3 text-sm">
            <p>
              <span class="font-medium">{{ tertaut.nama }}</span>
              <span class="text-redup"> ({{ tertaut.jenis }}, {{ tertaut.nomor_induk }})</span>
            </p>
            <button type="button" class="rounded-md border border-garis bg-white px-3 py-1.5 hover:bg-mist disabled:opacity-60" :disabled="sedangSibuk" @click="lepasTautan">
              Lepas tautan
            </button>
          </div>

          <div v-else class="mt-3 space-y-2">
            <label for="ed-cari-pegawai" class="block text-sm font-medium">Cari pegawai yang belum punya akun</label>
            <input id="ed-cari-pegawai" v-model="cariPegawai" type="search" placeholder="Nama atau nomor induk" class="w-full rounded-md border border-garis px-3 py-2 text-sm" />
            <div class="flex gap-2">
              <select v-model="pegawaiTerpilih" aria-label="Pegawai" class="min-w-0 flex-1 rounded-md border border-garis bg-white px-3 py-2 text-sm">
                <option value="">Pilih pegawai ({{ belumTertaut.length }})</option>
                <option v-for="p in belumTertaut" :key="p.id" :value="p.id">{{ p.nama }} ({{ p.jenis }}, {{ p.nomor_induk }})</option>
              </select>
              <button type="button" class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60" :disabled="sedangSibuk" @click="tautkan">
                Tautkan
              </button>
            </div>
          </div>
          <p v-if="pesan.tautan" role="alert" class="mt-3 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ pesan.tautan }}</p>
        </section>

        <!-- Role -->
        <section class="border-b border-garis py-6">
          <h3 class="font-semibold">Role</h3>
          <p v-if="!bolehKelola" class="mt-1 text-sm text-redup">Anda hanya dapat melihat role pengguna ini.</p>
          <ul :key="versi" class="mt-3 space-y-2">
            <li v-for="r in peran" :key="r.id">
              <label class="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  class="mt-0.5 size-4"
                  :checked="roleDimiliki.has(r.id)"
                  :disabled="!bolehKelola || sedangSibuk"
                  @change="ubahRole(r, $event.target.checked)"
                />
                <span>
                  <span class="font-medium">{{ r.nama }}</span>
                  <span v-if="r.deskripsi" class="block text-xs leading-relaxed text-redup">{{ r.deskripsi }}</span>
                </span>
              </label>
            </li>
          </ul>
          <p v-if="pesan.role" role="alert" class="mt-3 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ pesan.role }}</p>
        </section>

        <!-- Hak tambahan -->
        <section class="border-b border-garis py-6">
          <h3 class="font-semibold">Hak tambahan</h3>
          <p class="mt-1 text-sm text-redup">
            Hak di luar role, khusus untuk pengguna ini (misalnya Operator Arsip: role Operator Khusus ditambah hak modul Arsip).
          </p>

          <ul v-if="hakTambahan.length" :key="versi" class="mt-3 divide-y divide-garis rounded-md border border-garis text-sm">
            <li v-for="h in hakTambahan" :key="h.permission_id" class="flex items-center justify-between gap-3 px-4 py-2.5">
              <span>
                {{ labelModul[h.permissions?.modul] ?? h.permissions?.modul }}:
                {{ labelAksi[h.permissions?.aksi] ?? h.permissions?.aksi }}
                <span class="text-redup">({{ labelScope[h.data_scope] }})</span>
              </span>
              <button v-if="bolehKelola" type="button" class="text-bahaya hover:underline disabled:opacity-60" :disabled="sedangSibuk" @click="hapusHak(h)">
                Hapus
              </button>
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-redup">Belum ada hak tambahan.</p>

          <form v-if="bolehKelola" class="mt-4 grid gap-2 sm:grid-cols-3" @submit.prevent="tambahHak">
            <select v-model="hakBaru.modul" aria-label="Modul" class="rounded-md border border-garis bg-white px-3 py-2 text-sm">
              <option value="">Modul</option>
              <option v-for="m in modulOpsi" :key="m" :value="m">{{ labelModul[m] ?? m }}</option>
            </select>
            <select v-model="hakBaru.aksi" aria-label="Tindakan" class="rounded-md border border-garis bg-white px-3 py-2 text-sm">
              <option value="">Tindakan</option>
              <option v-for="a in aksiOpsi" :key="a" :value="a">{{ labelAksi[a] ?? a }}</option>
            </select>
            <select v-model="hakBaru.scope" aria-label="Cakupan data" class="rounded-md border border-garis bg-white px-3 py-2 text-sm">
              <option v-for="s in SCOPE_URUT" :key="s" :value="s">{{ labelScope[s] }}</option>
            </select>
            <button type="submit" class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60 sm:col-span-3 sm:justify-self-start" :disabled="sedangSibuk">
              Tambah hak
            </button>
          </form>
          <p v-if="pesan.hak" role="alert" class="mt-3 rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ pesan.hak }}</p>
        </section>

        <!-- Hak efektif -->
        <section class="pt-6">
          <details>
            <summary class="cursor-pointer font-semibold">Hak akses efektif ({{ ringkasan.length }} modul)</summary>
            <p class="mt-2 text-sm text-redup">Gabungan semua role dan hak tambahan, seperti yang berlaku bagi pengguna ini sekarang.</p>
            <p v-if="ringkasan.length === 0" class="mt-3 text-sm text-redup">
              Tidak ada hak akses. Akun nonaktif atau belum punya role.
            </p>
            <table v-else class="mt-3 w-full text-left text-sm">
              <tbody class="divide-y divide-garis border-y border-garis">
                <template v-for="m in ringkasan" :key="m.modul">
                  <tr v-for="(b, i) in m.baris" :key="m.modul + b.scope">
                    <th v-if="i === 0" scope="row" :rowspan="m.baris.length" class="w-2/5 py-2 pr-3 align-top font-medium">{{ m.label }}</th>
                    <td class="py-2 pr-3 text-redup">{{ b.scope }}</td>
                    <td class="py-2">{{ b.aksi }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </details>
        </section>
      </template>
    </div>
  </aside>
</template>
