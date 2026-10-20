import {
  LayoutDashboard, ListChecks, Megaphone, Users, CalendarDays, Banknote, TrendingUp,
  Hourglass, Mail, Archive, DoorOpen, Car, Package, Building2, Wrench, Camera,
  FileText, ShieldCheck, Network, Database, ScrollText,
} from 'lucide-vue-next'

// Satu item tampil di sidebar bila pengguna punya hak VIEW pada `modul`.
export const menu = [
  {
    judul: 'Utama',
    item: [
      { label: 'Dashboard', to: '/', modul: 'dashboard', ikon: LayoutDashboard, tepat: true },
      { label: 'Monitoring tugas', to: '/tugas', modul: 'tugas', ikon: ListChecks },
      { label: 'Pengumuman dan agenda', to: '/informasi', modul: 'informasi', ikon: Megaphone },
    ],
  },
  {
    judul: 'Kepegawaian',
    item: [
      { label: 'Data pegawai', to: '/kepegawaian/pegawai', modul: 'pegawai', ikon: Users },
      { label: 'Cuti', to: '/kepegawaian/cuti', modul: 'cuti', ikon: CalendarDays },
      { label: 'KGB', to: '/kepegawaian/kgb', modul: 'kgb', ikon: Banknote },
      { label: 'Kenaikan pangkat', to: '/kepegawaian/kenaikan-pangkat', modul: 'kenaikan_pangkat', ikon: TrendingUp },
      { label: 'Pensiun', to: '/kepegawaian/pensiun', modul: 'pensiun', ikon: Hourglass },
    ],
  },
  {
    judul: 'Administrasi',
    item: [
      { label: 'Persuratan', to: '/persuratan', modul: 'persuratan', ikon: Mail },
      { label: 'Arsip digital', to: '/arsip', modul: 'arsip', ikon: Archive },
      { label: 'Ruang rapat', to: '/administrasi/ruang-rapat', modul: 'ruang_rapat', ikon: DoorOpen },
      { label: 'Kendaraan dinas', to: '/administrasi/kendaraan', modul: 'kendaraan', ikon: Car },
      { label: 'Permintaan ATK', to: '/administrasi/atk', modul: 'atk', ikon: Package },
      { label: 'Sarana dan prasarana', to: '/administrasi/sarana', modul: 'sarana', ikon: Building2 },
      { label: 'Laporan kerusakan', to: '/administrasi/kerusakan', modul: 'kerusakan', ikon: Wrench },
    ],
  },
  {
    judul: 'Dokumentasi',
    item: [
      { label: 'Dokumentasi dan publikasi', to: '/dokumentasi', modul: 'dokumentasi', ikon: Camera },
      { label: 'Manajemen dokumen', to: '/dokumen', modul: 'dokumen', ikon: FileText },
    ],
  },
  {
    judul: 'Sistem',
    item: [
      { label: 'Pengguna dan hak akses', to: '/sistem/pengguna', modul: 'pengguna', ikon: ShieldCheck },
      { label: 'Struktur organisasi', to: '/sistem/organisasi', modul: 'organisasi', ikon: Network },
      { label: 'Master data', to: '/sistem/master-data', modul: 'master_data', ikon: Database },
      { label: 'Audit log', to: '/sistem/audit-log', modul: 'audit', ikon: ScrollText },
    ],
  },
]

export const labelModul = {
  dashboard: 'Dashboard', informasi: 'Pengumuman dan agenda', pegawai: 'Data pegawai',
  cuti: 'Cuti', kgb: 'KGB', kenaikan_pangkat: 'Kenaikan pangkat', pensiun: 'Pensiun',
  persuratan: 'Persuratan', arsip: 'Arsip digital', tugas: 'Monitoring tugas',
  ruang_rapat: 'Ruang rapat', kendaraan: 'Kendaraan dinas', atk: 'Permintaan ATK',
  sarana: 'Sarana dan prasarana', kerusakan: 'Laporan kerusakan',
  dokumentasi: 'Dokumentasi dan publikasi', dokumen: 'Manajemen dokumen',
  pengguna: 'Pengguna dan hak akses', organisasi: 'Struktur organisasi',
  master_data: 'Master data', audit: 'Audit log',
}

export const labelAksi = {
  VIEW: 'Lihat', CREATE: 'Tambah', EDIT: 'Ubah', DELETE: 'Hapus', PROCESS: 'Proses',
  APPROVE: 'Setujui', ASSIGN: 'Beri tugas', PRINT: 'Cetak', MANAGE: 'Kelola penuh',
}

export const labelScope = {
  sendiri: 'Data sendiri',
  unit_kerja: 'Unit kerja',
  seluruh: 'Seluruh BPKAD',
}
