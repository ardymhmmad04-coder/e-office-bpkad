export const JENIS = ['ASN', 'PPPK', 'PJLP']
export const GOL_LIST = [
  'Juru Muda (I/a)', 'Juru Muda Tingkat I (I/b)', 'Juru (I/c)', 'Juru Tingkat I (I/d)',
  'Pengatur Muda (II/a)', 'Pengatur Muda Tingkat I (II/b)', 'Pengatur (II/c)', 'Pengatur Tingkat I (II/d)',
  'Penata Muda (III/a)', 'Penata Muda Tingkat I (III/b)', 'Penata (III/c)', 'Penata Tingkat I (III/d)',
  'Pembina (IV/a)', 'Pembina Tingkat I (IV/b)', 'Pembina Utama Muda (IV/c)', 'Pembina Utama Madya (IV/d)',
  'Pembina Utama (IV/e)',
]
export const EDU_LIST = ['SD', 'SMP', 'SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3']
export const JENIS_PEKERJAAN = ['Administrasi', 'Pengemudi', 'Satpam', 'Kebersihan']
export const labelNomorInduk = { ASN: 'NIP', PPPK: 'NIPPPK', PJLP: 'No. Pesanan' }
export const PER_HALAMAN = 15

// Menyaring daftar pegawai. unitIds = Set id unit (unit terpilih + turunannya) atau null.
export function filterPegawai(daftar, { jenis = 'semua', unitIds = null, tanpaUnit = false, cari = '', status = 'aktif' } = {}) {
  const k = cari.trim().toLowerCase()
  return daftar.filter((p) => {
    if (jenis !== 'semua' && p.jenis !== jenis) return false
    if (status === 'aktif' && !p.aktif) return false
    if (status === 'nonaktif' && p.aktif) return false
    if (tanpaUnit && p.unit_kerja_id) return false
    if (unitIds && !unitIds.has(p.unit_kerja_id)) return false
    if (!k) return true
    return [p.nama, p.nomor_induk, p.jabatan].some((v) => (v ?? '').toLowerCase().includes(k))
  })
}

export function hitungPerJenis(daftar) {
  const hasil = { semua: daftar.length, ASN: 0, PPPK: 0, PJLP: 0 }
  for (const p of daftar) if (hasil[p.jenis] !== undefined) hasil[p.jenis]++
  return hasil
}

export function ambilHalaman(daftar, halaman, ukuran = PER_HALAMAN) {
  const jumlahHalaman = Math.max(1, Math.ceil(daftar.length / ukuran))
  const h = Math.min(Math.max(1, halaman), jumlahHalaman)
  return { baris: daftar.slice((h - 1) * ukuran, h * ukuran), total: daftar.length, jumlahHalaman, halaman: h }
}

const teks = (v) => {
  const s = (v ?? '').toString().trim()
  return s === '' ? null : s
}
// Angka bulat; kosong = null, 0 tetap 0 (nilai nol bukan "kosong")
const angka = (v) => {
  const s = teks(v)
  if (s === null) return null
  const x = Number(s)
  return Number.isFinite(x) ? Math.round(x) : null
}

// Mengubah isian formulir menjadi payload database sesuai jenis pegawai
export function bangunPayload(form, jenis) {
  const dasar = {
    jenis,
    nomor_induk: teks(form.nomor_induk),
    nama: teks(form.nama),
    jk: teks(form.jk),
    pendidikan: teks(form.pendidikan),
    jabatan: teks(form.jabatan),
    unit_kerja_id: teks(form.unit_kerja_id),
    no_hp: teks(form.no_hp),
    email: teks(form.email),
    aktif: !!form.aktif,
  }
  if (jenis === 'ASN') {
    return {
      ...dasar,
      pangkat: teks(form.pangkat),
      tmt_pangkat: teks(form.tmt_pangkat),
      tmt_kgb: teks(form.tmt_kgb),
      gaji: angka(form.gaji),
      masa_kerja_tahun: angka(form.masa_kerja_tahun),
      masa_kerja_bulan: angka(form.masa_kerja_bulan),
      tgl_sk_kgb_sebelumnya: teks(form.tgl_sk_kgb_sebelumnya),
      no_sk_kgb_sebelumnya: teks(form.no_sk_kgb_sebelumnya),
      batas_usia_pensiun: angka(form.batas_usia_pensiun),
    }
  }
  if (jenis === 'PJLP') {
    return { ...dasar, akhir_kontrak: teks(form.akhir_kontrak), jenis_pekerjaan: teks(form.jenis_pekerjaan) }
  }
  return { ...dasar, akhir_kontrak: teks(form.akhir_kontrak) }
}

// Pegawai biasa hanya boleh mengubah kontak (dijaga juga oleh trigger di database)
export function bangunPayloadTerbatas(form) {
  return { no_hp: teks(form.no_hp), email: teks(form.email) }
}

const KOLOM_FORM = [
  'nomor_induk', 'nama', 'jk', 'pendidikan', 'jabatan', 'unit_kerja_id', 'no_hp', 'email',
  'pangkat', 'tmt_pangkat', 'tmt_kgb', 'gaji', 'masa_kerja_tahun', 'masa_kerja_bulan',
  'tgl_sk_kgb_sebelumnya', 'no_sk_kgb_sebelumnya', 'batas_usia_pensiun', 'akhir_kontrak', 'jenis_pekerjaan',
]
export function formAwal(pegawai) {
  const form = { aktif: pegawai?.aktif ?? true }
  for (const k of KOLOM_FORM) form[k] = pegawai?.[k] ?? ''
  return form
}

// Memperkecil foto di browser (sisi terpanjang maksimal `maks` piksel) menjadi JPEG
export async function kecilkanGambar(file, maks = 640, kualitas = 0.85) {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar.')
  if (file.size > 15 * 1024 * 1024) throw new Error('Ukuran foto terlalu besar (maksimal 15 MB).')
  const bmp = await createImageBitmap(file)
  const skala = Math.min(1, maks / Math.max(bmp.width, bmp.height))
  const kanvas = document.createElement('canvas')
  kanvas.width = Math.max(1, Math.round(bmp.width * skala))
  kanvas.height = Math.max(1, Math.round(bmp.height * skala))
  kanvas.getContext('2d').drawImage(bmp, 0, 0, kanvas.width, kanvas.height)
  bmp.close?.()
  return new Promise((resolve, reject) => {
    kanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memproses foto.'))), 'image/jpeg', kualitas)
  })
}
