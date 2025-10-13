import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ? (import.meta.env.VITE_API_BASE + '/api') : 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.response.use(
  res => res,
  err => {
    // Basic demo-level global error handling
    console.error('API error', err?.response?.status, err?.response?.data)
    return Promise.reject(err)
  }
)

export default api
