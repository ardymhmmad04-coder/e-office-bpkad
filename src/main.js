import './style.css'

function tampilkanPesan(judul, isi) {
  const el = document.getElementById('app')
  el.replaceChildren()
  const kotak = document.createElement('div')
  kotak.style.cssText = 'max-width:34rem;margin:15vh auto;padding:0 1.5rem;font-family:system-ui,sans-serif;color:#14232b;line-height:1.6'
  const h = document.createElement('h1')
  h.textContent = judul
  h.style.cssText = 'font-size:1.25rem;margin:0 0 .5rem'
  const p = document.createElement('p')
  p.textContent = isi
  p.style.cssText = 'margin:0;color:#566770'
  kotak.append(h, p)
  el.append(kotak)
}

const konfigurasiLengkap =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

if (!konfigurasiLengkap) {
  tampilkanPesan(
    'Konfigurasi Supabase belum diisi',
    'Salin file .env.example menjadi .env, isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY, lalu jalankan ulang aplikasi.'
  )
} else {
  import('./app.js')
    .then(({ mulai }) => mulai())
    .catch((err) => {
      console.error(err)
      tampilkanPesan('Aplikasi gagal dimuat', err?.message || 'Terjadi kesalahan tak terduga saat memuat aplikasi.')
    })
}
