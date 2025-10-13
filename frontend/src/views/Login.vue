<template>
  <div style="max-width:420px">
    <h2>Login (demo)</h2>
    <form @submit.prevent="submit">
      <div style="margin-bottom:8px">
        <label>Username</label><br />
        <input v-model="form.username" />
      </div>
      <div style="margin-bottom:8px">
        <label>Password</label><br />
        <input type="password" v-model="form.password" />
      </div>
      <button>Login</button>
    </form>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ username: '', password: '' })

async function submit() {
  try {
    await auth.login({ username: form.username, password: form.password })
    router.push('/')
  } catch (e) {
    alert('Login failed (demo). Check backend auth endpoint.')
  }
}
</script>
