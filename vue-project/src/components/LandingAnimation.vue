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

    let sweepPos = -600
    let sweepSpeed = 10
    let transitionWidth = 900
    let fadeGap = 500
    let isFinished = false

    // helper to generate mask based on current dimensions
    const createMask = () => {
      pg = p.createGraphics(p.width, p.height)
      pg.pixelDensity(1)
      pg.background(255)
      pg.fill(0)
      pg.textAlign(p.CENTER, p.CENTER)
      pg.textStyle(p.BOLD)

      let baseSize = 100
      pg.textSize(baseSize)
      let tw = pg.textWidth('KOU')
      let th = pg.textAscent() + pg.textDescent()

      pg.push()
      pg.translate(p.width / 2, p.height / 2)
      // height stretch
      pg.scale(p.width / tw, (p.height * 1.1) / th)
      pg.text('KOU', 0, 0)
      pg.pop()
      pg.loadPixels()
    }

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight)
      p.pixelDensity(1)
      createMask()

      let spacing = p.width > 800 ? 2.2 : 2.0

      for (let x = 0; x < p.width; x += spacing) {
        for (let y = 0; y < p.height; y += spacing) {
          let index = (p.floor(x) + p.floor(y) * pg.width) * 4

          if (pg.pixels[index] < 128) {
            pixels.push({
              // store coordinates as percentages (0-1)
              nx: x / p.width,
              ny: y / p.height,
              baseSize: p.random(1.5, 2.8),
              stableRand: p.random(0, 1),
            })
          }
        }
      }
    }

    p.draw = () => {
      p.clear()
      sweepPos += sweepSpeed
      let anyVisible = false
      let frameShimmer = p.frameCount * 0.035

      for (let i = 0; i < pixels.length; i++) {
        let px = pixels[i]

        // map normalized coordinates back to actual screen pixels
        let curX = px.nx * p.width
        let curY = px.ny * p.height
        let curDiag = curX + curY

        // performance related, make it less resource taking
        let distIn = sweepPos - curDiag
        if (distIn < -100 || distIn > transitionWidth + fadeGap + transitionWidth + 100) {
          continue
        }

        let probIn = p.constrain(p.map(distIn, 0, transitionWidth, 0, 1), 0, 1)
        let distOut = sweepPos - (curDiag + fadeGap + transitionWidth)
        let probOut = p.constrain(p.map(distOut, 0, transitionWidth, 0, 1), 0, 1)

        let targetIntensity = probIn - probOut

        if (targetIntensity > 0.01) {
          let shine = p.sin(curDiag * 0.02 - frameShimmer)
          let specular = p.pow(p.map(shine, -1, 1, 0, 1), 4)

          if (px.stableRand < targetIntensity * (0.15 + specular * 0.85)) {
            anyVisible = true
            p.noStroke()
            p.fill(0)
            p.rect(curX, curY, px.baseSize, px.baseSize)
          }
        }
      }

      if (
        sweepPos > p.width + p.height + fadeGap + transitionWidth * 2 &&
        !anyVisible &&
        !isFinished
      ) {
        isFinished = true
        p.noLoop()
        emit('complete')
      }
    }

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight)
      // don't need to re-generate pixels array?
      // need to re-calculate the mask boundaries to stay clean
      createMask()
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
  z-index: 999;
  pointer-events: none;
}
.p5-canvas {
  width: 100%;
  height: 100%;
}
</style>
