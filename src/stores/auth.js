import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { usePermissionStore } from './permission'
import { pesanError } from '@/lib/errors'

let initPromise = null
let sedangLogin = false

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  const initialized = ref(false)
  const loadError = ref(null) // ditampilkan di layar, tidak disembunyikan

  const isLoggedIn = computed(() => !!session.value)

  // Memuat profil + hak akses. Error dilempar ke pemanggil.
  async function muatProfil() {
    const permission = usePermissionStore()
    const uid = session.value?.user?.id
    if (!uid) {
      profile.value = null
      permission.reset()
      return
    }

    const [hasilProfil] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nip, nama, email, jabatan, unit_kerja_id, foto_url, aktif, unit_kerja:unit_kerja_id(nama)')
        .eq('id', uid)
        .maybeSingle(), // maybeSingle: tidak error 406 bila baris belum ada
      permission.muat(),
    ])
    if (hasilProfil.error) throw hasilProfil.error

    if (!hasilProfil.data) {
      throw new Error('Profil akun Anda belum dibuat. Hubungi administrator.')
    }
    if (!hasilProfil.data.aktif) {
      await supabase.auth.signOut()
      throw new Error('Akun Anda dinonaktifkan. Hubungi administrator.')
    }
    profile.value = hasilProfil.data
    loadError.value = null
  }

  // Versi yang mencatat error ke state (dipakai saat dipanggil dari event, tanpa pemanggil yang bisa menangkap).
  async function muatProfilDanCatat() {
    try {
      await muatProfil()
    } catch (err) {
      console.error(err)
      loadError.value = pesanError(err)
    }
  }

  function init() {
    if (!initPromise) {
      initPromise = (async () => {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error(error)
          loadError.value = pesanError(error)
        } else {
          session.value = data.session
          await muatProfilDanCatat()
        }

        supabase.auth.onAuthStateChange((event, sesiBaru) => {
          // PENTING: jangan `await` panggilan Supabase di dalam callback ini
          // (dapat menyebabkan deadlock). Tunda dengan setTimeout.
          const idLama = session.value?.user?.id
          session.value = sesiBaru

          if (event === 'SIGNED_OUT') {
            setTimeout(() => {
              profile.value = null
              usePermissionStore().reset()
            }, 0)
          } else if (event === 'SIGNED_IN' && !sedangLogin && sesiBaru?.user?.id !== idLama) {
            setTimeout(() => muatProfilDanCatat(), 0)
          }
        })

        initialized.value = true
      })()
    }
    return initPromise
  }

  async function login(email, password) {
    sedangLogin = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      session.value = data.session
      await muatProfil() // dipanggil langsung, tidak menunggu event
    } catch (err) {
      await supabase.auth.signOut().catch((e) => console.error(e))
      session.value = null
      profile.value = null
      usePermissionStore().reset()
      throw err
    } finally {
      sedangLogin = false
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    session.value = null
    profile.value = null
    usePermissionStore().reset()
  }

  return { session, profile, initialized, loadError, isLoggedIn, init, login, logout, muatProfil: muatProfilDanCatat }
})
