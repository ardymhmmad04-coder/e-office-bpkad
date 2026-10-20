// Mengubah error Supabase/Postgres menjadi pesan yang jelas bagi pengguna.
// Pesan dari aturan di database (kode 42501 buatan sendiri) sudah berbahasa
// Indonesia dan ditampilkan apa adanya.
export function pesanError(err) {
  if (!err) return 'Terjadi kesalahan tak terduga.'
  const kode = err.code
  const pesan = err.message || ''

  if (pesan === 'Invalid login credentials') return 'Email atau kata sandi salah.'
  if (pesan.toLowerCase().includes('email not confirmed')) return 'Email belum dikonfirmasi. Hubungi administrator.'
  if (pesan.toLowerCase().includes('failed to fetch')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'

  if (kode === '42501') {
    return pesan.includes('row-level security')
      ? 'Anda tidak memiliki hak untuk melakukan tindakan ini.'
      : pesan
  }
  if (kode === '23P01') return 'Jadwal bentrok dengan pemakaian lain pada waktu yang sama.'
  if (kode === '23505') return 'Data yang sama sudah ada.'
  // Pesan buatan sendiri dari trigger database (sudah berbahasa Indonesia) ditampilkan apa adanya;
  // pesan bawaan Postgres diganti kalimat yang lebih ramah.
  if (kode === '23503') {
    return pesan.includes('violates foreign key') ? 'Data ini masih terhubung dengan data lain.' : pesan
  }
  if (kode === '23514') {
    return pesan.includes('violates check constraint')
      ? 'Isian tidak memenuhi aturan yang berlaku. Periksa kembali nilainya.'
      : pesan
  }
  if (kode === '23502') return 'Ada isian wajib yang belum diisi.'

  return pesan || 'Terjadi kesalahan tak terduga.'
}
