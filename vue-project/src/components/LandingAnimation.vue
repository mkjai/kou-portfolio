<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import p5 from 'p5'

const emit = defineEmits(['complete'])
const p5Container = ref(null)
let myP5 = null
let resizeObserver = null

let _resize = null

onMounted(async () => {
  const font = new FontFace('KOU', 'url(/KOU.ttf)')
  await font.load()
  document.fonts.add(font)

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
      pg.noStroke()

      const ctx = pg.drawingContext
      const fontSize = 120
      ctx.font = `bold ${fontSize}px KOU`

      // Measure using native canvas API so metrics match the actual font
      const metrics = ctx.measureText('KOU')
      const tw = metrics.width
      const th = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

      const hScale = (p.width * 1.05) / tw
      const vScale = (p.height * 1.05) / th

      ctx.save()
      ctx.scale(hScale, vScale)

      // In scaled space, center the text
      const scaledW = p.width / hScale
      const scaledH = p.height / vScale
      const drawX = (scaledW - tw) / 2
      const drawY = (scaledH - th) / 2 + metrics.actualBoundingBoxAscent

      ctx.fillStyle = '#000000'
      ctx.fillText('KOU', drawX, drawY)
      ctx.restore()

      pg.loadPixels()
    }

    const generatePixels = () => {
      pixels = []
      const spacing = 2
      for (let x = 0; x < p.width; x += spacing) {
        for (let y = 0; y < p.height; y += spacing) {
          const idx = (Math.floor(x) + Math.floor(y) * pg.width) * 4
          if (pg.pixels[idx] < 128) {
            pixels.push({
              nx: x / p.width,
              ny: y / p.height,
              baseSize: p.random(0.1, 1.1),
              stableRand: p.random(0, 1),
            })
          }
        }
      }
    }

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
      const frameShimmer = p.frameCount * 0.1

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
          const shine = p.sin(curDiag * 0.01 - frameShimmer)
          const specular = p.pow(p.map(shine, -1, 1, 0, 1), 1.9)
          if (px.stableRand < targetIntensity * (0.05 + specular * 0.95)) {
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

.p5-canvas {
  width: 100vw;
  height: 100vh;
  padding-left: 0.5rem;
}

.p5-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
