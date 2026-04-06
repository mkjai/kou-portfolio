<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import p5 from 'p5'

const route = useRoute()
const logoContainer = ref(null)
let logoP5 = null

onMounted(() => {
  const sketch = (p) => {
    const size = 32 // Circle size
    const grid = 8
    const pSize = size / grid

    let timer = 0
    let step = 1
    let ringProgress = 4

    p.setup = () => {
      p.createCanvas(size, size)
      p.noStroke()
      p.frameRate(12)
    }

    p.draw = () => {
      p.clear()
      p.fill(0)

      timer++
      if (timer % 4 === 0) {
        if (step === 1) {
          ringProgress = 4
          step = 2
        } else if (step === 2) {
          step = 3
        } else if (step === 3) {
          ringProgress--
          if (ringProgress <= 0) step = 4
        } else if (step === 4) {
          ringProgress = 1
          step = 5
        } else if (step === 5) {
          ringProgress++
          if (ringProgress >= 4) step = 1
        }
      }

      for (let x = 0; x < grid; x++) {
        for (let y = 0; y < grid; y++) {
          const dx = x - 3.5
          const dy = y - 3.5
          const dist = p.sqrt(dx * dx + dy * dy)

          if (step === 2 || step === 3) {
            if (dist <= 4 && dist >= 4 - ringProgress) {
              p.rect(x * pSize, y * pSize, pSize, pSize)
            }
          } else {
            if (dist <= ringProgress) {
              p.rect(x * pSize, y * pSize, pSize, pSize)
            }
          }
        }
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
      <RouterLink to="/stills" class="nav-link" :class="{ active: route.path === '/stills' }">
        Stills
      </RouterLink>
      <RouterLink to="/motions" class="nav-link" :class="{ active: route.path === '/motions' }">
        Motions
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
  /* CRITICAL: Centers everything vertically by their height */
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
}

.nav-links-container {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  /* Vertical center within the group */
  align-items: center;
}

/* NO CHANGES TO YOUR ORIGINAL LINK STYLES EXCEPT ALIGNMENT */
.nav-link {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1.15rem;
  font-weight: 400;
  letter-spacing: -0.01em;
  text-decoration: none;
  color: #000;
  /* Line-height 1 helps with precise centering */
  line-height: 1;
  display: inline-block;
}

.nav-link:hover,
.nav-link.active {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
</style>
