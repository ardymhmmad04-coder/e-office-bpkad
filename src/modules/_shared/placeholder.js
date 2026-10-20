// Rute sementara untuk modul yang belum dibangun. Ganti `component` dengan
// view yang sebenarnya saat modulnya dikerjakan.
export const placeholder = (path, name, meta) => ({
  path,
  name,
  component: () => import('@/components/common/ModulePlaceholder.vue'),
  meta,
})
