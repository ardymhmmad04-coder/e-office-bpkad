import { placeholder } from '../_shared/placeholder'

const dasar = 'Hasil peleburan E-Kepegawaian. Tabel dan aturan alurnya sudah siap di sql/15_kepegawaian.sql. '

export default [
  {
    path: 'kepegawaian/pegawai',
    name: 'pegawai',
    component: () => import('./views/PegawaiView.vue'),
    meta: { modul: 'pegawai', judul: 'Data pegawai' },
  },
  {
    path: 'kepegawaian/cuti',
    name: 'cuti',
    component: () => import('./views/CutiView.vue'),
    meta: { modul: 'cuti', judul: 'Cuti' },
  },
  placeholder('kepegawaian/kgb', 'kgb', {
    modul: 'kgb', judul: 'KGB', tahap: 1,
    deskripsi: dasar + 'Jatuh tempo dihitung dari TMT KGB pada data pegawai, seperti sebelumnya.',
  }),
  placeholder('kepegawaian/kenaikan-pangkat', 'kenaikan-pangkat', {
    modul: 'kenaikan_pangkat', judul: 'Kenaikan pangkat', tahap: 1,
    deskripsi: dasar + 'Dihitung dari TMT pangkat dan batas pendidikan pada data pegawai.',
  }),
  placeholder('kepegawaian/pensiun', 'pensiun', {
    modul: 'pensiun', judul: 'Pensiun', tahap: null,
    deskripsi: dasar + 'Dihitung dari tanggal lahir pada NIP dan batas usia pensiun. Belum ditempatkan pada tahap mana pun di roadmap.',
  }),
]
