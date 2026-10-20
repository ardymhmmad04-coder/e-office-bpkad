export default [
  {
    path: '',
    name: 'dashboard',
    component: () => import('./views/DashboardView.vue'),
    meta: { modul: 'dashboard', judul: 'Dashboard' },
  },
]
