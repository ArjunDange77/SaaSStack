<template>
  <div>
    <header style="padding:12px;">
      <div class="container" style="display:flex; align-items:center; justify-content:space-between">
        <div>
          <strong>SaaSStack</strong> — Dynamic Frontend
        </div>
        <nav>
          <router-link to="/" style="margin-right:12px">Home</router-link>
          <router-link to="/cosmetix" style="margin-right:12px">Cosmetix</router-link>
          <router-link to="/login">Login</router-link>
        </nav>
      </div>
    </header>

    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script setup>
</script>
