import { placeholder } from '../_shared/placeholder'

export default [
  placeholder('administrasi/ruang-rapat', 'ruang-rapat', {
    modul: 'ruang_rapat', judul: 'Ruang rapat', tahap: 2,
    deskripsi: 'Peminjaman ruang rapat dengan kalender. Jadwal bentrok ditolak langsung oleh database (sql/11_ruang_rapat.sql).',
  }),
  placeholder('administrasi/kendaraan', 'kendaraan', {
    modul: 'kendaraan', judul: 'Kendaraan dinas', tahap: 2,
    deskripsi: 'Pengajuan, persetujuan, penggunaan, dan pengembalian kendaraan dinas (sql/12_kendaraan.sql).',
  }),
  placeholder('administrasi/atk', 'atk', {
    modul: 'atk', judul: 'Permintaan ATK', tahap: 2, deskripsi: 'Permintaan alat tulis kantor (sql/13_layanan_umum.sql).',
  }),
  placeholder('administrasi/sarana', 'sarana', {
    modul: 'sarana', judul: 'Sarana dan prasarana', tahap: 2, deskripsi: 'Permintaan sarana dan prasarana (sql/13_layanan_umum.sql).',
  }),
  placeholder('administrasi/kerusakan', 'kerusakan', {
    modul: 'kerusakan', judul: 'Laporan kerusakan', tahap: 2, deskripsi: 'Pelaporan kerusakan fasilitas (sql/13_layanan_umum.sql).',
  }),
]
