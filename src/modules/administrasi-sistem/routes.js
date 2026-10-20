import { placeholder } from '../_shared/placeholder'

export default [
  {
    path: 'sistem/pengguna',
    name: 'pengguna',
    component: () => import('./views/PenggunaView.vue'),
    meta: { modul: 'pengguna', judul: 'Pengguna dan hak akses' },
  },
  {
    path: 'sistem/organisasi',
    name: 'organisasi',
    component: () => import('./views/OrganisasiView.vue'),
    meta: { modul: 'organisasi', judul: 'Struktur organisasi' },
  },
  placeholder('sistem/master-data', 'master-data', {
    modul: 'master_data', judul: 'Master data', tahap: 1,
    deskripsi: 'Kode klasifikasi, jenis surat, ruang rapat, dan kendaraan.',
  }),
  placeholder('sistem/audit-log', 'audit-log', {
    modul: 'audit', judul: 'Audit log', tahap: 1,
    deskripsi: 'Jejak perubahan data. Sudah tercatat otomatis oleh trigger (sql/03_audit_log.sql); tinggal halaman penelusurannya.',
  }),
]
