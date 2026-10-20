import { storeToRefs } from 'pinia'
import { usePermissionStore } from '@/stores/permission'

// Pemakaian di komponen:
//   const { can } = usePermission()
//   <button v-if="can('tugas', 'ASSIGN')">Beri tugas</button>
export function usePermission() {
  const store = usePermissionStore()
  const { daftar } = storeToRefs(store)
  return { can: store.can, canAny: store.canAny, scopeOf: store.scopeOf, daftar }
}
