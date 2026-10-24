const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/

const urutkanUnik = (daftar) => [...new Set(daftar)].sort()

// Membaca nilai pengaturan libur_<tahun> (larik tanggal berbentuk JSON).
// Mengembalikan { daftar, rusak }: nilai yang bukan larik tanggal ditandai rusak (tidak diam-diam diabaikan).
export function parseLibur(nilai) {
  if (nilai === null || nilai === undefined || String(nilai).trim() === '') return { daftar: [], rusak: false }
  let data
  try {
    data = JSON.parse(nilai)
  } catch {
    return { daftar: [], rusak: true }
  }
  if (!Array.isArray(data) || !data.every((x) => typeof x === 'string' && POLA_TANGGAL.test(x))) {
    return { daftar: [], rusak: true }
  }
  return { daftar: urutkanUnik(data), rusak: false }
}

export const serialisasiLibur = (daftar) => JSON.stringify(urutkanUnik(daftar))

// Menambah satu tanggal libur pada tahun tertentu
export function tambahLibur(daftar, tanggal, tahun) {
  if (!tanggal || !POLA_TANGGAL.test(tanggal)) return { daftar, galat: 'Pilih tanggal terlebih dahulu.' }
  if (Number(tanggal.slice(0, 4)) !== Number(tahun)) return { daftar, galat: `Tanggal harus berada di tahun ${tahun}.` }
  if (daftar.includes(tanggal)) return { daftar, galat: 'Tanggal itu sudah ada dalam daftar.' }
  return { daftar: urutkanUnik([...daftar, tanggal]), galat: '' }
}

export const hapusLibur = (daftar, tanggal) => daftar.filter((t) => t !== tanggal)

const parseLokal = (str) => {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const namaHari = (str) => parseLokal(str).toLocaleDateString('id-ID', { weekday: 'long' })
export const akhirPekan = (str) => [0, 6].includes(parseLokal(str).getDay())
export const tanggalPanjang = (str) =>
  parseLokal(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

// Angka bulat >= 0 dari isian teks. Kosong = tidak diisi; nol adalah nilai sah.
// Mengembalikan { kosong, valid, nilai }.
export function bacaAngka(teks) {
  const s = String(teks ?? '').trim()
  if (s === '') return { kosong: true, valid: true, nilai: null }
  if (!/^\d+$/.test(s)) return { kosong: false, valid: false, nilai: null }
  return { kosong: false, valid: true, nilai: Number(s) }
}
