import { placeholder } from '../_shared/placeholder'

const dasar = 'Modul ini berasal dari E-Kepegawaian yang akan dilebur ke E-Office. '

export default [
  placeholder('kepegawaian/pegawai', 'pegawai', {
    modul: 'pegawai', judul: 'Data pegawai', tahap: 1,
    deskripsi: dasar + 'Tabel akan disesuaikan setelah skema E-Kepegawaian yang ada dikirim.',
  }),
  placeholder('kepegawaian/cuti', 'cuti', {
    modul: 'cuti', judul: 'Cuti', tahap: 1,
    deskripsi: dasar + 'Alur: pegawai mengajukan, operator memverifikasi, pejabat berwenang menyetujui.',
  }),
  placeholder('kepegawaian/kgb', 'kgb', {
    modul: 'kgb', judul: 'KGB', tahap: 1, deskripsi: dasar,
  }),
  placeholder('kepegawaian/kenaikan-pangkat', 'kenaikan-pangkat', {
    modul: 'kenaikan_pangkat', judul: 'Kenaikan pangkat', tahap: 1, deskripsi: dasar,
  }),
  placeholder('kepegawaian/pensiun', 'pensiun', {
    modul: 'pensiun', judul: 'Pensiun', tahap: null,
    deskripsi: dasar + 'Pensiun ada di struktur menu tetapi belum ditempatkan pada tahap mana pun di roadmap.',
  }),
]
