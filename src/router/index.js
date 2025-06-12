import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/HelloWorld.vue'
import NewPage from '../views/NewPage.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/new-page', name: 'NewPage', component: NewPage }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router