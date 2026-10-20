import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

export function mulai() {
  const app = createApp(App)
  app.use(createPinia()) // harus sebelum router: guard memakai store
  app.use(router)
  app.mount('#app')
}
