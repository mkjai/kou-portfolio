<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import p5 from 'p5'

const emit = defineEmits(['complete'])
const p5Container = ref(null)
let myP5 = null

onMounted(() => {
  const sketch = (p) => {
    let pg
    let pixels = []

    // 1. INSTANT START:
    // Since min diagPos (x+y) is 0, starting at -300 ensures the
    // sparkle hits the top-left corner immediately.
    let lightPos = -300

    let sweepSpeed = 8 // Slightly faster for large screens
    let ditherTail = 1200
    let isFinished = false

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight)
      p.pixelDensity(1)

      pg = p.createGraphics(p.width, p.height)
      pg.pixelDensity(1)
      pg.background(255)
      pg.fill(0)
      pg.textAlign(p.CENTER, p.CENTER)
      pg.textStyle(p.BOLD)

      // 2. EXTREME BRUTALIST STRETCHING
      // We force the text to ignore its aspect ratio to fill the entire box
      let baseSize = 100
      pg.textSize(baseSize)
      let tw = pg.textWidth('KOU')
      let th = baseSize * 0.75 // Approximate cap height

      pg.push()
      pg.translate(p.width / 2, p.height / 2)
      // Scale X to fill width, Scale Y to fill height (Full Bleed)
      pg.scale(p.width / tw, p.height / th)
      pg.text('KOU', 0, 0)
      pg.pop()

      pg.loadPixels()

      // 3. DYNAMIC SPACING
      // We adjust spacing based on screen size to keep performance smooth
      // while maintaining the high-density grain look.
      let spacing = p.map(p.width, 400, 2500, 2.5, 5)

      for (let x = 0; x < p.width; x += spacing) {
        for (let y = 0; y < p.height; y += spacing) {
          let index = (p.floor(x) + p.floor(y) * pg.width) * 4

          if (pg.pixels[index] < 128 && p.random() > 0.12) {
            pixels.push({
              x: x,
              y: y,
              size: p.random(1.2, 3.0), // Slightly larger pixels for more grit
              diagPos: x + y,
              noiseOffset: p.random(-150, 150),
            })
          }
        }
      }
    }

    p.draw = () => {
      p.clear()

      lightPos += sweepSpeed
      let allGone = true

      for (let px of pixels) {
        // YOUR ORIGINAL LOGIC
        let distance = lightPos - (px.diagPos + px.noiseOffset)

        if (distance > 0) {
          let probability = p.map(distance, 0, ditherTail, 1.0, 0.0)
          probability = p.constrain(probability, 0, 1)

          if (p.random(1) < probability) {
            allGone = false
            p.noStroke()
            p.fill(0)
            p.rect(px.x, px.y, px.size, px.size)
          }
        } else {
          allGone = false
        }
      }

      if (lightPos > p.width + p.height + 600 && allGone && !isFinished) {
        isFinished = true
        p.noLoop()
        emit('complete')
      }
    }

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight)
    }
  }

  myP5 = new p5(sketch, p5Container.value)
})

onBeforeUnmount(() => {
  if (myP5) myP5.remove()
})
</script>

<template>
  <div class="landing-wrapper">
    <div ref="p5Container" class="p5-canvas"></div>
  </div>
</template>

<style scoped>
.landing-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 100; /* Ensure it covers everything */
  pointer-events: none;
}
.p5-canvas {
  width: 100%;
  height: 100%;
}
</style>
