<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <nav class="navbar">
    <RouterLink to="/" class="nav-link" :class="{ active: route.path === '/' }"> Home </RouterLink>
    <RouterLink to="/stills" class="nav-link" :class="{ active: route.path === '/stills' }">
      Stills
    </RouterLink>
    <RouterLink to="/motions" class="nav-link" :class="{ active: route.path === '/motions' }">
      Motions
    </RouterLink>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 1rem;
  right: 1.5rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0rem;
}

.nav-link {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1.15rem;
  font-weight: 400;
  letter-spacing: -0.01em;
  text-decoration: none;
  color: #000;
  line-height: 1.2;
}

.nav-link:hover {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

/* Active page = strikethrough */
.nav-link.active {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
</style>
