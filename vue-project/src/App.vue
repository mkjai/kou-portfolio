<script setup>
import { ref, provide } from 'vue'
import LandingAnimation from '@/components/LandingAnimation.vue'
import BackgroundAnimation from '@/components/BackgroundAnimation.vue'

const landingDone = ref(false)
const landingRemoved = ref(false)
const pageVisible = ref(false)
const bgVisible = ref(false)

// Pages can read pageVisible if needed
provide('pageVisible', pageVisible)

const onLandingComplete = () => {
  landingDone.value = true
  setTimeout(() => {
    landingRemoved.value = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pageVisible.value = true
        bgVisible.value = true
      })
    })
  }, 500)
}
</script>

<template>
  <!-- KOU landing — only mounts once at app startup, never again -->
  <div v-if="!landingRemoved" class="landing-layer" :class="{ 'landing-fade-out': landingDone }">
    <LandingAnimation @complete="onLandingComplete" />
  </div>

  <!-- Background — permanent, never remounts on navigation -->
  <div class="bg-fade" :class="{ 'bg-visible': bgVisible }">
    <BackgroundAnimation />
  </div>

  <!-- Page content fades in after landing, persists across route changes -->
  <div class="page-fade" :class="{ 'page-visible': pageVisible }">
    <RouterView />
  </div>
</template>

<style scoped>
.landing-layer {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: #f0f0f0;
  opacity: 1;
  transition: opacity 0.5s ease;
}

.landing-layer.landing-fade-out {
  opacity: 0;
}

.bg-fade {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.bg-fade.bg-visible {
  opacity: 1;
}

.page-fade {
  opacity: 0;
  transition: opacity 0.6s ease;
  position: relative;
  z-index: 1;
}

.page-fade.page-visible {
  opacity: 1;
}
</style>

<style>
html,
body {
  margin: 0;
  padding: 0;
  background: #fff;
  width: 100%;
  height: 100%;
}
</style>
