import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import DynamicCrud from '../views/DynamicCrud.vue'

const routes = [
  { path: '/', component: Home, meta: { requiresAuth: false } },
  { path: '/login', component: Login },
  { path: '/cosmetix', component: DynamicCrud, meta: { requiresAuth: false, resource: 'cosmetix' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
