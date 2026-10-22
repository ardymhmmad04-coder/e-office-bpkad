export const STATUS = {
  draft: { label: 'Draf', kelas: 'bg-mist text-redup' },
  step1: { label: 'Menunggu Kasubbag', kelas: 'bg-waspada-muda text-waspada' },
  step2: { label: 'Menunggu Kabid', kelas: 'bg-waspada-muda text-waspada' },
  approved: { label: 'Disetujui', kelas: 'bg-sukses-muda text-sukses' },
  rejected: { label: 'Ditolak', kelas: 'bg-bahaya-muda text-bahaya' },
  cancelled: { label: 'Dibatalkan', kelas: 'bg-mist text-redup' },
}

// Status step2 mencakup dua keadaan: menunggu Kabid, atau Kabid sudah setuju dan menunggu persetujuan akhir
export function statusTampil(c) {
  if (c.status === 'step2' && c.step2_at) {
    return { label: 'Menunggu persetujuan akhir', kelas: 'bg-waspada-muda text-waspada' }
  }
  return STATUS[c.status] ?? { label: c.status, kelas: 'bg-mist text-redup' }
}

// Tahap yang sedang ditunggu: 1 Kasubbag, 2 Kabid, 3 persetujuan akhir (Admin); null bila tidak sedang menunggu
export function tahapMenunggu(c) {
  if (c.status === 'step1') return 1
  if (c.status === 'step2') return c.step2_at ? 3 : 2
  return null
}

export const TAB = [
  { id: 'semua', label: 'Semua' },
  { id: 'draft', label: 'Draf' },
  { id: 'proses', label: 'Dalam proses' },
  { id: 'approved', label: 'Disetujui' },
  { id: 'selesai', label: 'Ditolak / dibatalkan' },
]

const cocokTab = (c, tab) => {
  if (tab === 'semua') return true
  if (tab === 'draft') return c.status === 'draft'
  if (tab === 'proses') return c.status === 'step1' || c.status === 'step2'
  if (tab === 'approved') return c.status === 'approved'
  if (tab === 'selesai') return c.status === 'rejected' || c.status === 'cancelled'
  return true
}

export function filterCuti(daftar, { tab = 'semua', cari = '', tahun = 'semua' } = {}) {
  const k = cari.trim().toLowerCase()
  return daftar.filter((c) => {
    if (!cocokTab(c, tab)) return false
    if (tahun !== 'semua' && String(c.tahun) !== String(tahun)) return false
    if (!k) return true
    return [c.nama, c.nip, c.jenis_cuti, c.no_surat].some((v) => (v ?? '').toLowerCase().includes(k))
  })
}

export function hitungPerTab(daftar) {
  const hasil = {}
  for (const t of TAB) hasil[t.id] = daftar.filter((c) => cocokTab(c, t.id)).length
  return hasil
}

// Aksi yang ditampilkan untuk pengguna tertentu. Ini hanya petunjuk tampilan:
// aturan sebenarnya ditegakkan database (fungsi cuti_* dan trigger).
//  punya = { proses, setuju, hapus } (boolean)
export function aksiTersedia(c, { punya, akunId, pegawaiId }) {
  const milik = c.created_by === akunId || (!!pegawaiId && c.pegawai_id === pegawaiId)
  const petugas = !!punya.proses
  const pejabat = !!punya.setuju
  const aksi = []

  if (c.status === 'draft') {
    if (milik || petugas) aksi.push('ubah', 'ajukan', 'batalkan')
    if (c.created_by === akunId || punya.hapus) aksi.push('hapus')
  } else if (c.status === 'step1') {
    if (petugas || pejabat) aksi.push('setujui1', 'tolak1')
    if (milik || petugas) aksi.push('batalkan')
  } else if (c.status === 'step2' && !c.step2_at) {
    if (petugas || pejabat) aksi.push('setujui2', 'tolak2')
    if (petugas) aksi.push('batalkan')
  } else if (c.status === 'step2' && c.step2_at) {
    if (petugas) aksi.push('setujui3', 'batalkan')
  } else if (c.status === 'approved') {
    if (petugas) aksi.push('batalkan')
  } else if ((c.status === 'rejected' || c.status === 'cancelled') && punya.hapus) {
    aksi.push('hapus')
  }
  return aksi
}

// ----- Tanggal -----
const parseLokal = (str) => {
  const [y, m, d] = String(str).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function formatTanggal(str) {
  if (!str) return '-'
  const dt = parseLokal(str)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
export function rentangTanggal(c) {
  return c.tgl_mulai === c.tgl_selesai ? formatTanggal(c.tgl_mulai) : `${formatTanggal(c.tgl_mulai)} s.d. ${formatTanggal(c.tgl_selesai)}`
}
export function formatWaktu(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' })
}

// Menambah bulan pada tanggal 'YYYY-MM-DD'; bila tanggal tujuan tidak ada, dipakai hari terakhir bulan itu
// (30 Nov + 3 bulan = 28/29 Feb, bukan melompat ke Maret)
export function tambahBulan(str, jumlah) {
  if (!str) return ''
  const [y, m, d] = str.split('-').map(Number)
  const bulanBaru = m - 1 + jumlah
  const tahun = y + Math.floor(bulanBaru / 12)
  const bulan = ((bulanBaru % 12) + 12) % 12
  const hariTerakhir = new Date(tahun, bulan + 1, 0).getDate()
  const dt = new Date(tahun, bulan, Math.min(d, hariTerakhir))
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// ----- WhatsApp (tautan wa.me; pengiriman otomatis memerlukan layanan server terpisah) -----
export function normalisasiWA(nomor) {
  let n = String(nomor ?? '').replace(/\D/g, '')
  if (!n) return ''
  if (n.startsWith('0')) n = '62' + n.slice(1)
  else if (n.startsWith('8')) n = '62' + n
  return n
}
export function linkWA(nomor, pesan) {
  const n = normalisasiWA(nomor)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(pesan)}` : ''
}

export const KUNCI_TEMPLAT = [
  'wa_tmpl_pengajuan', 'wa_tmpl_step1', 'wa_tmpl_step1_pegawai',
  'wa_tmpl_step2', 'wa_tmpl_approved', 'wa_tmpl_rejected',
]
// Dipakai bila templat belum ada di pengaturan
export const TEMPLAT_BAWAAN = {
  wa_tmpl_pengajuan: 'Pengajuan cuti baru dari {nama} (NIP {nip}): {jenis_cuti}, {tgl_mulai} s.d. {tgl_selesai} ({hari_kerja} hari). Mohon tindak lanjutnya.',
  wa_tmpl_step1: 'Pengajuan {jenis_cuti} {nama} ({tgl_mulai} s.d. {tgl_selesai}) telah disetujui {disetujui_oleh}. Mohon persetujuan Bapak/Ibu.',
  wa_tmpl_step1_pegawai: 'Pengajuan {jenis_cuti} Anda telah disetujui atasan langsung ({disetujui_oleh}) dan diteruskan ke pejabat berwenang.',
  wa_tmpl_step2: 'Pengajuan {jenis_cuti} Anda ({tgl_mulai} s.d. {tgl_selesai}) telah disetujui {disetujui_oleh}. Menunggu persetujuan akhir.',
  wa_tmpl_approved: '{jenis_cuti} {nama} ({tgl_mulai} s.d. {tgl_selesai}, {hari_kerja} hari) telah DISETUJUI. Nomor surat: {no_surat}. Sisa cuti tahunan: {sisa_cuti} hari.',
  wa_tmpl_rejected: 'Pengajuan {jenis_cuti} {nama} ({tgl_mulai} s.d. {tgl_selesai}) DITOLAK oleh {disetujui_oleh}. Alasan: {alasan}',
}

const PENGGANTI = [
  'nama', 'nip', 'jenis_cuti', 'tgl_mulai', 'tgl_selesai', 'hari_kerja', 'no_surat', 'alasan', 'disetujui_oleh', 'sisa_cuti',
]
export function isiTemplat(templat, data) {
  let hasil = templat ?? ''
  for (const k of PENGGANTI) {
    const nilai = data[k]
    hasil = hasil.split(`{${k}}`).join(nilai === undefined || nilai === null || nilai === '' ? '-' : String(nilai))
  }
  return hasil
}

// Data untuk templat dari sebuah pengajuan
export function dataTemplat(c, { sisa } = {}) {
  const terakhir = c.status === 'rejected'
    ? (c.step2_note ? c.step2_by : c.step1_by)
    : c.final_by || (c.step2_at ? c.step2_by : c.step1_by)
  return {
    nama: c.nama,
    nip: c.nip,
    jenis_cuti: c.jenis_cuti,
    tgl_mulai: formatTanggal(c.tgl_mulai),
    tgl_selesai: formatTanggal(c.tgl_selesai),
    hari_kerja: c.hari_kerja,
    no_surat: c.no_surat,
    alasan: c.step2_note || c.step1_note,
    disetujui_oleh: terakhir,
    sisa_cuti: sisa,
  }
}

// Penerima notifikasi yang relevan menurut status sekarang. Hanya yang punya nomor WA.
export function daftarNotifikasi(c, templat = {}, { sisa } = {}) {
  const ambil = (kunci) => templat[kunci] || TEMPLAT_BAWAAN[kunci]
  const data = dataTemplat(c, { sisa })
  const item = (label, nomor, kunci) => ({
    label,
    nomor,
    link: linkWA(nomor, isiTemplat(ambil(kunci), data)),
  })

  let kandidat = []
  if (c.status === 'step1') {
    kandidat = [item('Atasan langsung (Kasubbag)', c.wa_atasan1, 'wa_tmpl_pengajuan')]
  } else if (c.status === 'step2' && !c.step2_at) {
    kandidat = [
      item('Pejabat berwenang (Kabid)', c.wa_atasan2, 'wa_tmpl_step1'),
      item('Pegawai', c.wa_pegawai, 'wa_tmpl_step1_pegawai'),
    ]
  } else if (c.status === 'step2') {
    kandidat = [item('Pegawai', c.wa_pegawai, 'wa_tmpl_step2')]
  } else if (c.status === 'approved') {
    kandidat = [
      item('Pegawai', c.wa_pegawai, 'wa_tmpl_approved'),
      item('Atasan langsung (Kasubbag)', c.wa_atasan1, 'wa_tmpl_approved'),
      item('Pejabat berwenang (Kabid)', c.wa_atasan2, 'wa_tmpl_approved'),
    ]
  } else if (c.status === 'rejected') {
    kandidat = [
      item('Pegawai', c.wa_pegawai, 'wa_tmpl_rejected'),
      item('Atasan langsung (Kasubbag)', c.wa_atasan1, 'wa_tmpl_rejected'),
      item('Pejabat berwenang (Kabid)', c.wa_atasan2, 'wa_tmpl_rejected'),
    ]
  }
  return kandidat.filter((x) => x.link)
}
