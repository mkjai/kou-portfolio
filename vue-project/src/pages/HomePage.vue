<script setup>
import { ref } from 'vue'
import KouAnimation from '../components/LandingAnimation.vue'

// Tracks whether the intro animation has finished
const isIntroDone = ref(false)

// Triggered when the p5 sketch finishes its thinning animation
const revealPortfolio = () => {
  isIntroDone.value = true
}
</script>

<template>
  <main class="home-wrapper">
    <Transition name="fade">
      <KouAnimation v-if="!isIntroDone" @complete="revealPortfolio" />
    </Transition>

    <Transition name="fade-up">
      <div v-show="isIntroDone" class="portfolio-content">
        <h1>Director & Producer Portfolio</h1>
        <p>This content will smoothly fade in and float up.</p>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
/* .home-wrapper {
  position: relative;
  min-height: 100vh;
}

.portfolio-content {
  padding: 40px;
  color: #333;
} */

/* --- VUE TRANSITION CSS --- */

/* How the KOU animation fades out */
.fade-leave-active {
  transition: opacity 1.5s ease; /* 1.5 seconds long */
}
.fade-leave-to {
  opacity: 0;
}

/* How the home page content fades in and floats up */
.fade-up-enter-active {
  transition: all 1.5s ease;
  transition-delay: 0.3s; /* Waits a split second for the canvas to start fading */
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(20px); /* Starts slightly lower down */
}
.fade-up-enter-to {
  opacity: 1;
  transform: translateY(0); /* Floats up to its natural resting place */
}
</style>
