import { placeholder } from '../_shared/placeholder'

export default [
  {
    path: 'sistem/pengguna',
    name: 'pengguna',
    component: () => import('./views/PenggunaView.vue'),
    meta: { modul: 'pengguna', judul: 'Pengguna dan hak akses' },
  },
  placeholder('sistem/organisasi', 'organisasi', {
    modul: 'organisasi', judul: 'Struktur organisasi', tahap: 1,
    deskripsi: 'Hierarki unit kerja. Cakupan data "unit kerja" mengikuti struktur ini, termasuk unit di bawahnya.',
  }),
  placeholder('sistem/master-data', 'master-data', {
    modul: 'master_data', judul: 'Master data', tahap: 1,
    deskripsi: 'Kode klasifikasi, jenis surat, ruang rapat, dan kendaraan.',
  }),
  placeholder('sistem/audit-log', 'audit-log', {
    modul: 'audit', judul: 'Audit log', tahap: 1,
    deskripsi: 'Jejak perubahan data. Sudah tercatat otomatis oleh trigger (sql/03_audit_log.sql); tinggal halaman penelusurannya.',
  }),
]
