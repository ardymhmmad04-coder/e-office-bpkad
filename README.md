# E-Office BPKAD

Portal internal ASN Badan Pengelolaan Keuangan dan Aset Daerah Provinsi Kalimantan Selatan.

Stack: Vue 3 + Vite + Vue Router + Pinia + Tailwind CSS 4 + Supabase (database, auth, storage), deploy di Vercel.

## Menjalankan

1. Buat project Supabase, lalu salin `.env.example` menjadi `.env` dan isi URL serta **anon key** (bukan service_role).
2. Jalankan file di folder `sql/` **satu per satu, berurutan**, di Supabase SQL Editor (lihat tabel di bawah). Setiap file aman dijalankan ulang.
3. Buat akun pertama di Supabase: Authentication > Users > Add user. Profil dan role `pegawai` terbentuk otomatis.
4. Jadikan akun itu Super Admin dengan Blok D di akhir `sql/04_seed_rbac.sql` (ganti UUID-nya).
5. `npm install`, lalu `npm run dev`.

Deploy: hubungkan repo ke Vercel, isi dua variabel env yang sama. `vercel.json` sudah mengatur rewrite untuk Vue Router.

## Urutan SQL

| File | Isi | Tahap |
|---|---|---|
| 01_core | unit_kerja, profiles | inti |
| 02_rbac | role, permission, data scope, fungsi hak akses, RLS inti | inti |
| 03_audit_log | audit_log + trigger audit | inti |
| 04_seed_rbac | 5 role, daftar permission, hak bawaan | inti |
| 05_tugas | Monitoring Tugas | 1 |
| 06_dokumentasi | kegiatan, media, berita | 1 |
| 07_dokumen_referensi | SOP, peraturan, pedoman, template | 1 |
| 08_informasi | pengumuman, agenda, notifikasi | 1 |
| 09_persuratan | klasifikasi, jenis surat, register, penomoran | 2 |
| 10_arsip | arsip digital + pencarian | 2 |
| 11_ruang_rapat | peminjaman ruang rapat | 2 |
| 12_kendaraan | kendaraan dinas | 2 |
| 13_layanan_umum | ATK, sarana prasarana, laporan kerusakan | 2 |
| 14_storage | bucket file + policy | 2 |
| 15_kepegawaian | pegawai (ASN/PPPK/PJLP), cuti, alokasi cuti, pengaturan, foto & logo | 1 |
| 16_seed_unit_kerja | struktur organisasi BPKAD (dari daftar UNITS E-Kepegawaian) | 1 |
| migrasi/17_migrasi_ekepegawaian | memindahkan data lama (jalankan blok demi blok, hanya sekali) | 1 |
| 18_pengguna | fungsi pendukung modul Pengguna + pengaman anti-terkunci | 1 |

## Pengguna dan hak akses

Halaman `Sistem > Pengguna dan hak akses` (butuh hak `pengguna`):
- **Pengguna:** cari/filter, ubah nama, NIP, jabatan, unit kerja, status aktif; tautkan akun ke data pegawai;
  atur role; beri hak tambahan per pengguna; lihat hak efektif.
- **Role dan hak akses:** matriks modul x tindakan x cakupan per role, tambah/ubah/hapus role kustom.
- Akun baru tetap dibuat di Supabase (Authentication > Users). Membuat akun dari aplikasi memerlukan
  Edge Function dengan service role; belum dibuat.
- Pengaman: Super Admin terakhir tidak bisa dicabut atau dinonaktifkan, dan hak "kelola pengguna" milik
  Super Admin terkunci. Pengaman ini tidak berlaku di SQL Editor sehingga keadaan darurat tetap bisa diperbaiki.
- Perubahan hak akses role baru berlaku bagi pengguna yang sedang login setelah mereka memuat ulang halaman.

## Kepegawaian (hasil peleburan E-Kepegawaian)

- Tabel `asn`, `pppk`, `pjlp` digabung menjadi satu tabel `pegawai` (kolom `jenis`). Nama kolom lama dipertahankan.
- KGB, kenaikan pangkat, dan pensiun tetap **dihitung** dari kolom pegawai (tmt_kgb, tmt_pangkat, NIP, batas_usia_pensiun), bukan tabel terpisah.
- Alur cuti memakai status lama: draft, step1, step2, approved, rejected, cancelled. Pegawai dapat membuat dan mengajukan cuti
  sendiri; petugas (PROCESS) atau pejabat (APPROVE) menggerakkan step1/step2; **persetujuan akhir hanya APPROVE**
  dan memberi nomor surat `NNN/CUTI/BPKAD/<tahun>` secara atomik (nomor lama dilanjutkan oleh skrip migrasi).
- Token Fonnte tidak lagi disimpan di tabel yang bisa dibaca klien. Simpan di `pengaturan_rahasia` (tanpa policy,
  hanya service role); pengiriman WhatsApp sebaiknya lewat Edge Function.
- Akun login ditautkan ke pegawai lewat `profiles.pegawai_id` (satu akun satu pegawai).

### Memindahkan data dari E-Kepegawaian lama

1. Gunakan project Supabase **baru** untuk E-Office (jangan jalankan 01-16 di project lama: tabel `profiles` lama
   berbeda bentuk dan akan bentrok).
2. Ekspor CSV dari project lama: asn, pppk, pjlp, cuti, alokasi_cuti, settings. Impor di project baru dengan nama
   `legacy_asn`, `legacy_pppk`, `legacy_pjlp`, `legacy_cuti`, `legacy_alokasi_cuti`, `legacy_settings`.
3. Jalankan `sql/16_seed_unit_kerja.sql`, lalu `sql/migrasi/17_migrasi_ekepegawaian.sql` blok demi blok.
   Blok E menampilkan pegawai yang unitnya belum terpetakan dan baris yatim yang dilewati.
4. Buat ulang akun login di Authentication > Users, lalu tautkan (Blok F). Kata sandi lama tidak ikut dipindahkan.
5. Foto lama tetap berupa URL di project lama (kolom `foto`); jangan hapus project lama sebelum foto dipindahkan.
   Riwayat `activity_log` lama tidak dimigrasi: simpan sebagai arsip.

## Model hak akses

`User -> Role -> Permission -> Data scope`

- Permission: VIEW, CREATE, EDIT, DELETE, PROCESS, APPROVE, ASSIGN, PRINT, MANAGE.
- MANAGE mencakup semua aksi **kecuali APPROVE**: Super Admin tidak otomatis menggantikan persetujuan pimpinan.
- Data scope: `sendiri`, `unit_kerja` (unit sendiri **dan semua unit di bawahnya**), `seluruh`.
- Hak tambahan per pengguna (Operator Khusus) lewat tabel `user_permissions`.
- Semua aturan ditegakkan di database (RLS dan trigger), bukan hanya di tampilan. Frontend memakai
  `my_permissions()` untuk menyembunyikan menu/tombol; logikanya (`stores/permission.js`) sama dengan `perm_scope()` di SQL.

Agar cakupan `unit_kerja` bekerja, isi `unit_kerja_id` pada profil tiap pengguna. Kepala BPKAD ditempatkan
di unit induk teratas sehingga otomatis mencakup seluruh unit.

## Aturan alur yang sudah dijaga database

- Tugas: PIC hanya mengubah progres/status; status `selesai` hanya oleh pemegang APPROVE (verifikasi).
- Berita: draft, review, menunggu persetujuan, disetujui (APPROVE), terbit (PROCESS).
- Surat: nomor hanya lewat `terbitkan_nomor_surat()` (penghitung atomik, nomor UNIQUE), tidak bisa diisi manual.
- Ruang rapat dan kendaraan: jadwal bentrok ditolak (kode 23P01).
- Pengajuan (ruang, kendaraan, ATK, sarana, kerusakan): pemohon hanya dapat mengubah/membatalkan selama status awal.
- Pengguna biasa tidak dapat mengubah NIP, jabatan, unit kerja, atau status akunnya sendiri.

## Asumsi yang perlu Anda koreksi

- `ASSIGN` ditambahkan sebagai permission (contoh "Kepala Bidang" di dokumen memakainya, tetapi tidak ada di daftar 8 permission).
- Format nomor surat di `jenis_surat.format_nomor` hanya contoh; sesuaikan dengan tata naskah dinas BPKAD.
- Modul Kendaraan dinas ada di alur utama dan roadmap tetapi tidak di struktur menu; saya sertakan.
- Persetujuan ruang rapat, ATK, dan sarana oleh Admin/Operator; cuti/KGB/kenaikan pangkat/pensiun, kendaraan, dan berita oleh Pimpinan.
- "Sarana dan prasarana" dimodelkan sebagai permintaan layanan (bukan inventaris).
- Pensiun ada di struktur menu tetapi tidak masuk tahap mana pun di roadmap.
- Persetujuan akhir cuti saya set ke pejabat (APPROVE), sesuai alur di dokumen gambaran umum. Di E-Kepegawaian lama persetujuan akhir dilakukan Admin; bila ingin tetap begitu, beri Admin/Operator hak APPROVE pada modul cuti.

## Struktur

```
src/
  config/menu.js           menu sidebar + label modul/aksi
  lib/                     supabase client, penerjemah pesan error
  stores/                  auth.js, permission.js (Pinia)
  composables/usePermission.js
  router/index.js          guard login + hak akses per rute
  layouts/                 DefaultLayout, AuthLayout
  components/common/       sidebar, topbar, placeholder modul
  modules/<modul>/         routes.js + views/ (satu folder per modul)
sql/                       skema database, 14 blok
```

Rute modul yang belum dibangun memakai `ModulePlaceholder`; ganti dengan view asli saat modulnya dikerjakan.
