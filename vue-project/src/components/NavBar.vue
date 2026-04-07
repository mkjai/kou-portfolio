<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import p5 from 'p5'

const route = useRoute()
const logoContainer = ref(null)
let logoP5 = null

onMounted(() => {
  const sketch = (p) => {
    const size = 32 // Size of the square logo

    p.setup = () => {
      p.createCanvas(size, size)
      p.noStroke()
      // We keep the frameRate high for active, energetic grain movement
      p.frameRate(30)
      p.pixelDensity(1)
    }

    p.draw = () => {
      p.clear()

      // We draw the grain fresh every frame to create movement
      // Increase the loop count (e.g., 800) for higher density
      for (let i = 0; i < 700; i++) {
        const x = p.random(0, size)
        const y = p.random(0, size)

        // Randomize size slightly for texture
        const w = p.random(0.5, 1.5)

        // Darkest grains are pure #000
        // Varying alpha creates the "shuffling" noise effect
        const alpha = p.random(250, 255)

        p.fill(255, alpha)
        p.rect(x, y, w, w)
      }
    }
  }
  logoP5 = new p5(sketch, logoContainer.value)
})

onBeforeUnmount(() => {
  if (logoP5) logoP5.remove()
})
</script>

<template>
  <nav class="navbar">
    <RouterLink to="/" class="logo-wrapper">
      <div ref="logoContainer" class="p5-logo-container"></div>
    </RouterLink>

    <div class="nav-links-container">
      <RouterLink to="/" class="nav-link" :class="{ active: route.path === '/' }">
        Home
      </RouterLink>
      <RouterLink to="/still" class="nav-link" :class="{ active: route.path === '/still' }">
        Still
      </RouterLink>
      <RouterLink to="/motion" class="nav-link" :class="{ active: route.path === '/motion' }">
        Motion
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
  right: 1.5rem;
  z-index: 1000;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  /* Keeps the links and square logo aligned in a straight line */
  align-items: center;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  line-height: 0;
  text-decoration: none;
}

.p5-logo-container {
  width: 32px;
  height: 32px;
  display: block;
  /* Optional: Ensures the square edges look sharp against the background */
  background-color: transparent;
}

.nav-links-container {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1.15rem;
  font-weight: 400;
  letter-spacing: -0.01em;
  text-decoration: none;
  color: #fff;
  line-height: 1;
  display: inline-block;
}

.nav-link:hover,
.nav-link.active {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
</style>
