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

    // Diagonal sweep starts at a negative value
    // It will travel from 0 up to (width + height)
    let lightPos = -1000

    // ADJUST SPEED: Since diagonal distance is longer,
    // we bump this slightly to keep the timing tight.
    let sweepSpeed = 6
    let ditherTail = 1000
    let isFinished = false

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight)
      p.pixelDensity(1)

      pg = p.createGraphics(p.width, p.height)
      pg.pixelDensity(1)
      pg.background(255)
      pg.fill(0)
      pg.textAlign(p.CENTER, p.CENTER)

      let fontSize = p.windowWidth > 800 ? 380 : 180
      pg.textSize(fontSize)
      pg.textStyle(p.BOLD)

      pg.text('KOU', pg.width / 2, pg.height / 2)
      pg.loadPixels()

      let spacing = p.windowWidth > 800 ? 3 : 2.5

      for (let x = 0; x < p.width; x += spacing) {
        for (let y = 0; y < p.height; y += spacing) {
          let index = (x + y * pg.width) * 4

          if (pg.pixels[index] < 128 && p.random() > 0.15) {
            pixels.push({
              x: x,
              y: y,
              size: p.random(1, 2.2),
              // Diagonal light logic uses (x + y)
              diagPos: x + y,
              // Keeps the edges jagged and "sparkly"
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
        // DIAGONAL LOGIC:
        // We compare the light position to the sum of x and y
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

      // Exit logic: lightPos must exceed width + height + the noise/tail buffer
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
  z-index: 50;
  pointer-events: none;
}
.p5-canvas {
  width: 100%;
  height: 100%;
}
</style>
