<script setup>
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { pesanError } from '@/lib/errors'
import { usePermission } from '@/composables/usePermission'
import { ratakanUnit } from '../lib/pengguna'
import { idTurunan, jumlahSaudara } from '../lib/organisasi'

const props = defineProps({
  unit: { type: Object, default: null }, // null = unit baru
  parentId: { type: String, default: null }, // induk awal untuk unit baru
  semuaUnit: { type: Array, required: true },
  ringkasan: { type: Object, default: null }, // { jumlah_akun, jumlah_pegawai, jumlah_sub }
})
const emit = defineEmits(['tutup', 'tersimpan'])

const TIDAK_TERSIMPAN = 'Perubahan tidak tersimpan. Periksa hak akses Anda.'
const { can } = usePermission()
const baru = computed(() => props.unit === null)
const bolehSimpan = computed(() => can('organisasi', baru.value ? 'CREATE' : 'EDIT'))
const bolehHapus = computed(() => !baru.value && can('organisasi', 'DELETE'))

const form = ref({
  nama: props.unit?.nama ?? '',
  kode: props.unit?.kode ?? '',
  parent_id: props.unit ? (props.unit.parent_id ?? '') : (props.parentId ?? ''),
  urutan: props.unit?.urutan ?? jumlahSaudara(props.semuaUnit, props.parentId),
  aktif: props.unit?.aktif ?? true,
})

// Pilihan induk: semua unit kecuali dirinya dan turunannya (mencegah lingkaran)
const opsiInduk = computed(() => {
  const dikecualikan = props.unit ? idTurunan(props.semuaUnit, props.unit.id) : new Set()
  if (props.unit) dikecualikan.add(props.unit.id)
  return ratakanUnit(props.semuaUnit).filter((u) => !dikecualikan.has(u.id))
})

const sibuk = ref('')
const galat = ref('')
const konfirmasiHapus = ref(false)

const dipakai = computed(() => {
  const r = props.ringkasan
  if (!r) return 0
  return Number(r.jumlah_akun) + Number(r.jumlah_pegawai) + Number(r.jumlah_sub)
})

async function simpan() {
  galat.value = ''
  const nama = form.value.nama.trim()
  if (!nama) {
    galat.value = 'Nama unit wajib diisi.'
    return
  }
  const urutan = Number.parseInt(form.value.urutan, 10)
  const data = {
    nama,
    kode: form.value.kode.trim() || null,
    parent_id: form.value.parent_id || null,
    urutan: Number.isNaN(urutan) ? 0 : urutan,
    aktif: form.value.aktif,
  }

  sibuk.value = 'simpan'
  try {
    const q = baru.value
      ? supabase.from('unit_kerja').insert(data).select('id')
      : supabase.from('unit_kerja').update(data).eq('id', props.unit.id).select('id')
    const { data: hasil, error } = await q
    if (error) {
      if (error.code === '23505') throw new Error('Kode unit tersebut sudah dipakai unit lain.')
      throw error
    }
    if (!hasil?.length) throw new Error(TIDAK_TERSIMPAN)
    emit('tersimpan', baru.value ? 'Unit baru ditambahkan.' : 'Perubahan unit tersimpan.')
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
    const { data, error } = await supabase.from('unit_kerja').delete().eq('id', props.unit.id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error(TIDAK_TERSIMPAN)
    emit('tersimpan', 'Unit dihapus.')
    emit('tutup')
  } catch (err) {
    console.error(err)
    galat.value = pesanError(err)
    konfirmasiHapus.value = false
  } finally {
    sibuk.value = ''
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 bg-ink/40" aria-hidden="true" @click="emit('tutup')"></div>

  <aside
    class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    :aria-label="baru ? 'Tambah unit' : 'Ubah unit'"
    @keydown.esc="emit('tutup')"
  >
    <header class="flex items-center justify-between gap-3 border-b border-garis px-5 py-4">
      <h2 class="text-lg font-semibold">{{ baru ? 'Tambah unit' : 'Ubah unit' }}</h2>
      <button type="button" class="rounded p-1.5 hover:bg-mist" aria-label="Tutup" @click="emit('tutup')">
        <X :size="20" />
      </button>
    </header>

    <form class="flex-1 space-y-4 overflow-y-auto px-5 py-5" @submit.prevent="simpan">
      <div>
        <label for="un-nama" class="block text-sm font-medium">Nama unit</label>
        <input id="un-nama" v-model="form.nama" :disabled="!bolehSimpan" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
      </div>

      <div>
        <label for="un-kode" class="block text-sm font-medium">Kode unit (opsional)</label>
        <input id="un-kode" v-model="form.kode" :disabled="!bolehSimpan" class="mt-1 w-full rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
        <p class="mt-1 text-xs text-redup">Dipakai pada nomor surat (placeholder {unit}). Tidak boleh sama dengan unit lain.</p>
      </div>

      <div>
        <label for="un-induk" class="block text-sm font-medium">Berada di bawah</label>
        <select id="un-induk" v-model="form.parent_id" :disabled="!bolehSimpan" class="mt-1 w-full rounded-md border border-garis bg-white px-3 py-2 text-sm disabled:bg-mist">
          <option value="">Tidak ada (unit teratas)</option>
          <option v-for="u in opsiInduk" :key="u.id" :value="u.id">{{ '\u00A0\u00A0'.repeat(u.depth) + u.nama }}</option>
        </select>
      </div>

      <div>
        <label for="un-urutan" class="block text-sm font-medium">Urutan tampil</label>
        <input id="un-urutan" v-model="form.urutan" type="number" :disabled="!bolehSimpan" class="mt-1 w-28 rounded-md border border-garis px-3 py-2 text-sm disabled:bg-mist" />
        <p class="mt-1 text-xs text-redup">Angka lebih kecil tampil lebih dulu di antara unit selevel. Bisa juga diatur dengan tombol naik/turun di daftar.</p>
      </div>

      <label class="flex items-start gap-2 text-sm">
        <input v-model="form.aktif" type="checkbox" :disabled="!bolehSimpan" class="mt-0.5 size-4" />
        <span>
          Unit aktif
          <span class="block text-xs text-redup">Unit yang sudah tidak dipakai sebaiknya dinonaktifkan, bukan dihapus.</span>
        </span>
      </label>

      <p v-if="galat" role="alert" class="rounded-md bg-bahaya-muda px-3 py-2 text-sm text-bahaya">{{ galat }}</p>

      <div class="flex flex-wrap items-center gap-3">
        <button v-if="bolehSimpan" type="submit" class="rounded-md bg-barito-700 px-4 py-2 text-sm font-semibold text-white hover:bg-barito-800 disabled:opacity-60" :disabled="sibuk !== ''">
          {{ sibuk === 'simpan' ? 'Menyimpan...' : 'Simpan' }}
        </button>
        <button type="button" class="rounded-md border border-garis px-4 py-2 text-sm hover:bg-mist" @click="emit('tutup')">Batal</button>
      </div>

      <section v-if="bolehHapus" class="border-t border-garis pt-4">
        <h3 class="text-sm font-semibold">Hapus unit</h3>
        <p v-if="dipakai > 0" class="mt-1 text-sm text-redup">
          Unit ini masih dipakai ({{ ringkasan.jumlah_akun }} akun, {{ ringkasan.jumlah_pegawai }} pegawai,
          {{ ringkasan.jumlah_sub }} sub unit) sehingga tidak dapat dihapus. Pindahkan datanya atau nonaktifkan unit ini.
        </p>
        <template v-else>
          <button v-if="!konfirmasiHapus" type="button" class="mt-2 text-sm text-bahaya hover:underline" @click="konfirmasiHapus = true">
            Hapus unit ini
          </button>
          <div v-else class="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span class="text-bahaya">Hapus unit ini secara permanen?</span>
            <button type="button" class="rounded-md bg-bahaya px-3 py-1.5 font-semibold text-white disabled:opacity-60" :disabled="sibuk !== ''" @click="hapus">Ya, hapus</button>
            <button type="button" class="rounded-md border border-garis px-3 py-1.5 hover:bg-mist" @click="konfirmasiHapus = false">Batal</button>
          </div>
        </template>
      </section>
    </form>
  </aside>
</template>
