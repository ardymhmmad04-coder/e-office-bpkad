import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'

import dashboard from '@/modules/dashboard/routes'
import monitoringTugas from '@/modules/monitoring-tugas/routes'
import informasi from '@/modules/informasi/routes'
import kepegawaian from '@/modules/kepegawaian/routes'
import persuratan from '@/modules/persuratan/routes'
import arsipDigital from '@/modules/arsip-digital/routes'
import administrasiUmum from '@/modules/administrasi-umum/routes'
import dokumentasiPublikasi from '@/modules/dokumentasi-publikasi/routes'
import manajemenDokumen from '@/modules/manajemen-dokumen/routes'
import administrasiSistem from '@/modules/administrasi-sistem/routes'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/views/LoginView.vue'),
    meta: { public: true, judul: 'Masuk' },
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      ...dashboard,
      ...monitoringTugas,
      ...informasi,
      ...kepegawaian,
      ...persuratan,
      ...arsipDigital,
      ...administrasiUmum,
      ...dokumentasiPublikasi,
      ...manajemenDokumen,
      ...administrasiSistem,
      {
        path: 'akses-ditolak',
        name: 'forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
        meta: { judul: 'Akses ditolak' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notfound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { public: true, judul: 'Halaman tidak ditemukan' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.public) {
    if (to.name === 'login' && auth.isLoggedIn) return { name: 'dashboard' }
    return true
  }
  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const modul = to.meta.modul
  if (modul && !usePermissionStore().can(modul, to.meta.aksi ?? 'VIEW')) {
    return { name: 'forbidden' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.judul ? `${to.meta.judul} - E-Office BPKAD` : 'E-Office BPKAD'
})

export default router
