import { defineStore } from 'pinia'
import api from '../api/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('access') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),
  actions: {
    async login(credentials) {
      // demo login flow - adapt endpoints to your backend
      const r = await api.post('/auth/login/', credentials)
      this.accessToken = r.data.access
      localStorage.setItem('access', r.data.access)
      // optionally fetch user profile
      try {
        const me = await api.get('/users/me/')
        this.user = me.data
        localStorage.setItem('user', JSON.stringify(me.data))
      } catch (e) {
        // ignore if /users/me/ not present
      }
    },
    logout() {
      this.accessToken = null
      this.user = null
      localStorage.removeItem('access')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }
})
