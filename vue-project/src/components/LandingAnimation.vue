<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import p5 from 'p5'

const emit = defineEmits(['complete'])
const p5Container = ref(null)
let myP5 = null
let resizeObserver = null

// These are set from inside the sketch so ResizeObserver can call them directly
let _resize = null

onMounted(() => {
  const sketch = (p) => {
    let pg
    let pixels = []

    let sweepPos = -600
    const sweepSpeed = 10
    const transitionWidth = 900
    const fadeGap = 500
    let isFinished = false

    const createMask = () => {
      if (pg) pg.remove()
      pg = p.createGraphics(p.width, p.height)
      pg.pixelDensity(1)
      pg.background(255)
      pg.fill(0)
      pg.textAlign(p.CENTER, p.CENTER)
      pg.textStyle(p.BOLD)
      pg.textSize(100)

      const tw = pg.textWidth('KOU')
      const ascent = pg.textAscent()
      const descent = pg.textDescent()
      const th = ascent + descent

      const hScale = (p.width * 1.05) / tw
      const vScale = (p.height * 1.05) / th

      // Use LEFT/TOP so we control exact position — CENTER alignment
      // has inconsistent offsets when scaled non-uniformly
      pg.textAlign(p.LEFT, p.TOP)

      // After scaling, rendered size = tw*hScale x th*vScale
      // Offset so it's perfectly centered on both axes
      const drawX = (p.width - tw * hScale) / 2
      const drawY = (p.height - th * vScale) / 2

      pg.push()
      pg.translate(drawX, drawY)
      pg.scale(hScale, vScale)
      pg.text('KOU', 0, 0)
      pg.pop()
      pg.loadPixels()
    }

    const generatePixels = () => {
      pixels = []
      const spacing = 2.2
      for (let x = 0; x < p.width; x += spacing) {
        for (let y = 0; y < p.height; y += spacing) {
          const idx = (Math.floor(x) + Math.floor(y) * pg.width) * 4
          if (pg.pixels[idx] < 128) {
            pixels.push({
              nx: x / p.width,
              ny: y / p.height,
              baseSize: p.random(1.5, 2.8),
              stableRand: p.random(0, 1),
            })
          }
        }
      }
    }

    // Expose to outer scope so ResizeObserver can call it
    _resize = (w, h) => {
      p.resizeCanvas(w, h)
      createMask()
      generatePixels()
    }

    p.setup = () => {
      const el = p5Container.value
      p.createCanvas(el.clientWidth, el.clientHeight)
      p.pixelDensity(1)
      createMask()
      generatePixels()
    }

    p.draw = () => {
      p.clear()
      sweepPos += sweepSpeed
      let anyVisible = false
      const frameShimmer = p.frameCount * 0.035

      for (let i = 0; i < pixels.length; i++) {
        const px = pixels[i]
        const curX = px.nx * p.width
        const curY = px.ny * p.height
        const curDiag = curX + curY

        const distIn = sweepPos - curDiag
        if (distIn < -100 || distIn > transitionWidth + fadeGap + transitionWidth + 100) continue

        const probIn = p.constrain(p.map(distIn, 0, transitionWidth, 0, 1), 0, 1)
        const distOut = sweepPos - (curDiag + fadeGap + transitionWidth)
        const probOut = p.constrain(p.map(distOut, 0, transitionWidth, 0, 1), 0, 1)
        const targetIntensity = probIn - probOut

        if (targetIntensity > 0.01) {
          const shine = p.sin(curDiag * 0.02 - frameShimmer)
          const specular = p.pow(p.map(shine, -1, 1, 0, 1), 4)
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
  }

  myP5 = new p5(sketch, p5Container.value)

  // Instantly react to any container size change
  resizeObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect
    if (_resize && width > 0 && height > 0) {
      _resize(Math.floor(width), Math.floor(height))
    }
  })
  resizeObserver.observe(p5Container.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  myP5?.remove()
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
  inset: 0;
  z-index: 999;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/*
  Control the canvas size here with CSS.
  100vw / 100vh = full brutalist bleed.
  You can also use e.g. 90vw / 80vh for breathing room.
*/
.p5-canvas {
  width: 100vw;
  height: 100vh;
  padding-right: 0.5rem;
}

/* Stretch the p5 <canvas> element to fill the container */
.p5-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
