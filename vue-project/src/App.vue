<script setup>
import { ref, provide } from 'vue'
import LandingAnimation from '@/components/LandingAnimation.vue'
import BackgroundAnimation from '@/components/BackgroundAnimation.vue'
import NavBar from '@/components/NavBar.vue'

const landingDone = ref(false)
const landingRemoved = ref(false)
const pageVisible = ref(false)
const bgVisible = ref(false)

provide('pageVisible', pageVisible)

const onLandingComplete = () => {
  landingDone.value = true
  setTimeout(() => {
    landingRemoved.value = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // All three flip at the exact same time
        pageVisible.value = true
        bgVisible.value = true
      })
    })
  }, 500)
}
</script>

<template>
  <!-- KOU landing -->
  <div v-if="!landingRemoved" class="landing-layer" :class="{ 'landing-fade-out': landingDone }">
    <LandingAnimation @complete="onLandingComplete" />
  </div>

  <!-- Background -->
  <div class="bg-fade" :class="{ visible: bgVisible }">
    <BackgroundAnimation />
  </div>

  <!-- NavBar: same fade class/timing as bg and page -->
  <div class="nav-fade" :class="{ visible: pageVisible }">
    <NavBar />
  </div>

  <!-- Page content -->
  <div class="page-fade" :class="{ visible: pageVisible }">
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

/* All three share the same fade timing */
.bg-fade,
.nav-fade,
.page-fade {
  opacity: 0;
  transition: opacity 0.6s ease;
}
.bg-fade.visible,
.nav-fade.visible,
.page-fade.visible {
  opacity: 1;
}

.bg-fade {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  isolation: isolate;
}

.nav-fade {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 100;
  /* Blend against actual page pixels — must be on the fixed element itself,
     not a child, otherwise it only blends inside its own transparent wrapper */
  mix-blend-mode: difference;
}

.page-fade {
  position: relative;
  z-index: 1;
}
</style>

<style>
html,
body {
  margin: 0;
  padding: 0;
  background: #fff;
  width: 100%;
}
</style>
