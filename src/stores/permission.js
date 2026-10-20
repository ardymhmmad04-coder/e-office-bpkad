import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const URUTAN_SCOPE = { sendiri: 1, unit_kerja: 2, seluruh: 3 }

export const usePermissionStore = defineStore('permission', () => {
  const daftar = ref([]) // [{ modul, aksi, data_scope }]
  const dimuat = ref(false)

  async function muat() {
    const { data, error } = await supabase.rpc('my_permissions')
    if (error) throw error
    daftar.value = data ?? []
    dimuat.value = true
  }

  function reset() {
    daftar.value = []
    dimuat.value = false
  }

  // Aturan sama dengan fungsi SQL perm_scope():
  // MANAGE mencakup semua aksi KECUALI APPROVE.
  function scopeOf(modul, aksi = 'VIEW') {
    let terbaik = null
    for (const p of daftar.value) {
      if (p.modul !== modul) continue
      const cocok = p.aksi === aksi || (p.aksi === 'MANAGE' && aksi !== 'APPROVE')
      if (cocok && (!terbaik || URUTAN_SCOPE[p.data_scope] > URUTAN_SCOPE[terbaik])) {
        terbaik = p.data_scope
      }
    }
    return terbaik
  }

  const can = (modul, aksi = 'VIEW') => scopeOf(modul, aksi) !== null
  const canAny = (modul) => daftar.value.some((p) => p.modul === modul)

  return { daftar, dimuat, muat, reset, scopeOf, can, canAny }
})
