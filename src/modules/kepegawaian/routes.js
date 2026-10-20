import { placeholder } from '../_shared/placeholder'

const dasar = 'Hasil peleburan E-Kepegawaian. Tabel dan aturan alurnya sudah siap di sql/15_kepegawaian.sql. '

export default [
  placeholder('kepegawaian/pegawai', 'pegawai', {
    modul: 'pegawai', judul: 'Data pegawai', tahap: 1,
    deskripsi: dasar + 'ASN, PPPK, dan PJLP kini dalam satu tabel (kolom jenis).',
  }),
  placeholder('kepegawaian/cuti', 'cuti', {
    modul: 'cuti', judul: 'Cuti', tahap: 1,
    deskripsi: dasar + 'Alur: draf, Kasubbag, Kabid, lalu persetujuan akhir pejabat dengan nomor surat otomatis.',
  }),
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
