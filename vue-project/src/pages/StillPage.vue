<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// ─── Auto-load ────────────────────────────────────────────────────────────────
const allImages = import.meta.glob(
  '/src/assets/stills/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true },
)

function loadLives() {
  const folders = {}
  for (const path in allImages) {
    const segs = path.split('/')
    const filename = segs[segs.length - 1]
    const folderName = segs[segs.length - 2]
    if (!folderName || folderName === 'stills') continue
    if (!folders[folderName]) folders[folderName] = []
    folders[folderName].push({ filename, url: allImages[path].default || allImages[path] })
  }
  return Object.entries(folders)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([folderName, photos]) => {
      photos.sort((a, b) => a.filename.localeCompare(b.filename))
      const parts = folderName.split('_')
      return {
        id: folderName,
        title: (parts[1] || 'Untitled').replace(/-/g, ' '),
        date: parts[2] || '',
        gallery: photos.map((p) => p.url),
      }
    })
}

const lives = ref(loadLives())

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const isLightboxOpen = ref(false)
const currentLive = ref(null)
const currentIndex = ref(0)

const SLIDE_VW = 72
const GAP_VW = 2
const SLIDE_STEP = SLIDE_VW + GAP_VW
const FRICTION = 0.93
const SNAP_VEL = 0.04
const VEL_SCALE = 0.016

let position = 0,
  velocity = 0,
  rafId = null,
  snapping = false
const livePosition = ref(0)

const stripOffsetVw = computed(() => -livePosition.value + (100 - SLIDE_VW) / 2)

const openLightbox = (live, idx = 0) => {
  currentLive.value = live
  currentIndex.value = idx
  position = idx * SLIDE_STEP
  velocity = 0
  livePosition.value = idx * SLIDE_STEP
  snapping = false
  isLightboxOpen.value = true
  document.body.style.overflow = 'hidden'
  startLoop()
}
const closeLightbox = () => {
  isLightboxOpen.value = false
  document.body.style.overflow = ''
  stopLoop()
  velocity = 0
}

function clampPosition(pos) {
  const len = currentLive.value?.gallery.length ?? 1
  return Math.max(0, Math.min((len - 1) * SLIDE_STEP, pos))
}
function nearestSlide(pos) {
  return Math.round(pos / SLIDE_STEP)
}

function loop() {
  const len = currentLive.value?.gallery.length ?? 1
  const maxPos = (len - 1) * SLIDE_STEP

  if (snapping) {
    const target = currentIndex.value * SLIDE_STEP
    const diff = target - position
    position += diff * 0.12
    velocity = 0
    if (Math.abs(diff) < 0.02) {
      position = target
      snapping = false
    }
  } else {
    position = clampPosition(position + velocity)
    velocity *= FRICTION
    if (Math.abs(velocity) < SNAP_VEL) {
      velocity = 0
      currentIndex.value = nearestSlide(position)
      snapping = true
    }
    if (position <= 0 || position >= maxPos) velocity *= -0.1
  }

  livePosition.value = position

  rafId = requestAnimationFrame(loop)
}
function startLoop() {
  if (!rafId) rafId = requestAnimationFrame(loop)
}
function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
}
function handleWheel(e) {
  if (!isLightboxOpen.value) return
  e.preventDefault()
  velocity -= e.deltaY * VEL_SCALE
  snapping = false
  const maxVel = SLIDE_STEP * 0.4
  velocity = Math.max(-maxVel, Math.min(maxVel, velocity))
}

// ─── Touch support for mobile lightbox ───────────────────────────────────────
let touchStartX = 0

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX
  velocity = 0
  snapping = false
  startLoop()
}
function handleTouchMove(e) {
  e.preventDefault()
}
function handleTouchEnd(e) {
  const delta = touchStartX - e.changedTouches[0].clientX
  const threshold = 40 // px — any swipe longer than this snaps to next/prev

  const len = currentLive.value?.gallery.length ?? 1
  if (delta > threshold && currentIndex.value < len - 1) {
    currentIndex.value++
  } else if (delta < -threshold && currentIndex.value > 0) {
    currentIndex.value--
  }
  snapping = true
}

// ─── Row canvas: composite ALL photos into ONE canvas seamlessly ──────────────
const ROW_H = 180 // px — fixed row height
const COLS = 10,
  ROWS = 8,
  RADIUS = 90,
  MAX_DISP = 14,
  LERP = 0.14
const rowStates = new Map() // canvas → rowState

function buildRowState(canvas, urls, imgs) {
  const W = canvas.width,
    H = canvas.height
  const seeds = []
  for (let i = 0; i < COLS * ROWS; i++) {
    const a = Math.random() * Math.PI * 2
    seeds.push({ dx: Math.cos(a), dy: Math.sin(a) })
  }
  return {
    canvas,
    urls,
    imgs,
    W,
    H,
    tileW: W / COLS,
    tileH: H / ROWS,
    seeds,
    disp: new Float32Array(COLS * ROWS * 2),
    mouse: { x: -999999, y: -999999 },
    frame: null,
    active: false,
    // per-photo slice widths (px) for click detection
    sliceW: W / imgs.length,
  }
}

function centerCrop(ctx, img, dx, dy, dw, dh) {
  // Crops the center of img to fill dx,dy,dw,dh exactly (like object-fit:cover)
  const iw = img.naturalWidth,
    ih = img.naturalHeight
  const sliceAspect = dw / dh
  const imgAspect = iw / ih
  let sx, sy, sw, sh
  if (imgAspect > sliceAspect) {
    sh = ih
    sw = ih * sliceAspect
    sx = (iw - sw) / 2
    sy = 0
  } else {
    sw = iw
    sh = iw / sliceAspect
    sx = 0
    sy = (ih - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function drawRowClean(state) {
  const { canvas, imgs, W, H } = state
  const ctx = canvas.getContext('2d')
  const n = imgs.length
  ctx.clearRect(0, 0, W, H)
  imgs.forEach((img, i) => {
    if (!img.complete || !img.naturalWidth) return
    // Use Math.round for x and ceil for width to ensure slices tile seamlessly
    const x = Math.round((i * W) / n)
    const x2 = Math.round(((i + 1) * W) / n)
    centerCrop(ctx, img, x, 0, x2 - x, H)
  })
}

function drawRowFrame(state) {
  const { canvas, imgs, W, H, tileW, tileH, seeds, disp, mouse } = state
  const ctx = canvas.getContext('2d')
  const radius = RADIUS // in canvas-px

  let changed = false
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      const dist = Math.hypot(mouse.x - (c + 0.5) * tileW, mouse.y - (r + 0.5) * tileH)
      const t = Math.max(0, 1 - dist / radius)
      const str = t * t * MAX_DISP
      const px = i * 2,
        py = i * 2 + 1
      disp[px] += (seeds[i].dx * str - disp[px]) * LERP
      disp[py] += (seeds[i].dy * str - disp[py]) * LERP
      if (Math.abs(disp[px]) > 0.15 || Math.abs(disp[py]) > 0.15) changed = true
    }
  }

  // Draw the clean composite into an offscreen buffer first
  const off = new OffscreenCanvas(W, H)
  const octx = off.getContext('2d')
  const sliceW = W / imgs.length
  imgs.forEach((img, i) => {
    if (!img.complete || !img.naturalWidth) return
    centerCrop(octx, img, i * sliceW, 0, sliceW, H)
  })

  // Now tile-displace from the offscreen buffer onto main canvas
  ctx.clearRect(0, 0, W, H)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      const sx = c * tileW,
        sy = r * tileH
      ctx.save()
      ctx.translate(disp[i * 2], disp[i * 2 + 1])
      ctx.drawImage(off, sx, sy, tileW, tileH, sx, sy, tileW, tileH)
      ctx.restore()
    }
  }

  if (changed || state.active) state.frame = requestAnimationFrame(() => drawRowFrame(state))
}

const rowObservers = new Map()

function mountRow(el) {
  if (!el) return
  const canvas = el.querySelector('canvas.row-canvas')
  if (!canvas) return

  const live = lives.value.find((l) => l.id === el.dataset.id)
  if (!live) return

  if (rowStates.has(canvas)) return

  // Load all images first
  const imgs = live.gallery.map((url) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    return img
  })

  // Use ResizeObserver so canvas dimensions always match actual rendered size
  const initCanvas = (W) => {
    // Canvas pixel size = exact CSS display px — no DPR scaling needed,
    // the browser handles device pixel density via CSS
    canvas.width = W
    canvas.height = ROW_H

    let state = rowStates.get(canvas)
    if (state) {
      // Update dimensions and redraw
      state.W = W
      state.H = ROW_H
      state.tileW = W / COLS
      state.tileH = ROW_H / ROWS
      state.sliceW = W / imgs.length
    } else {
      state = buildRowState(canvas, live.gallery, imgs)
      rowStates.set(canvas, state)
    }

    let loaded = 0
    const tryDraw = () => {
      loaded++
      if (loaded >= imgs.length) drawRowClean(state)
    }
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) tryDraw()
      else img.addEventListener('load', tryDraw, { once: true })
    })
  }

  const ro = new ResizeObserver((entries) => {
    const W = Math.round(entries[0].contentRect.width)
    if (W > 0) initCanvas(W)
  })
  ro.observe(el)
  rowObservers.set(canvas, ro)
}

function rowEnter(e) {
  const canvas = e.currentTarget.querySelector('canvas.row-canvas')
  const state = canvas && rowStates.get(canvas)
  if (!state) return
  state.active = true
  cancelAnimationFrame(state.frame)
  drawRowFrame(state)
}
function rowLeave(e) {
  const canvas = e.currentTarget.querySelector('canvas.row-canvas')
  const state = canvas && rowStates.get(canvas)
  if (!state) return
  state.active = false
  state.mouse = { x: -999999, y: -999999 }
}
function rowMove(e) {
  const canvas = e.currentTarget.querySelector('canvas.row-canvas')
  const state = canvas && rowStates.get(canvas)
  if (!state) return
  const rect = canvas.getBoundingClientRect()
  const DPR = window.devicePixelRatio || 1
  state.mouse = {
    x: (e.clientX - rect.left) * DPR,
    y: (e.clientY - rect.top) * DPR,
  }
}
function rowClick(e, live) {
  openLightbox(live, 0)
}

// ─── Lightbox slide canvases ──────────────────────────────────────────────────
const slideStates = new Map()

function buildSlideState(canvas, img) {
  const iW = img.naturalWidth,
    iH = img.naturalHeight
  const seeds = []
  for (let i = 0; i < COLS * ROWS; i++) {
    const a = Math.random() * Math.PI * 2
    seeds.push({ dx: Math.cos(a), dy: Math.sin(a) })
  }
  return {
    canvas,
    img,
    iW,
    iH,
    tileW: iW / COLS,
    tileH: iH / ROWS,
    seeds,
    disp: new Float32Array(COLS * ROWS * 2),
    mouse: { x: -999999, y: -999999 },
    frame: null,
    active: false,
  }
}

function drawSlideFrame(state) {
  const { canvas, img, iW, iH, tileW, tileH, seeds, disp, mouse } = state
  const ctx = canvas.getContext('2d')
  const radius = RADIUS * (iW / 800)
  let changed = false

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      const dist = Math.hypot(mouse.x - (c + 0.5) * tileW, mouse.y - (r + 0.5) * tileH)
      const t = Math.max(0, 1 - dist / radius)
      const str = t * t * MAX_DISP * (iW / 800)
      const px = i * 2,
        py = i * 2 + 1
      disp[px] += (seeds[i].dx * str - disp[px]) * LERP
      disp[py] += (seeds[i].dy * str - disp[py]) * LERP
      if (Math.abs(disp[px]) > 0.15 || Math.abs(disp[py]) > 0.15) changed = true
    }
  }
  ctx.clearRect(0, 0, iW, iH)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      const sx = c * tileW,
        sy = r * tileH
      ctx.save()
      ctx.translate(disp[i * 2], disp[i * 2 + 1])
      ctx.drawImage(img, sx, sy, tileW, tileH, sx, sy, tileW, tileH)
      ctx.restore()
    }
  }
  if (changed || state.active) state.frame = requestAnimationFrame(() => drawSlideFrame(state))
}

function mountSlide(el) {
  if (!el) return
  const canvas = el.querySelector('canvas.tile-canvas')
  const img = el.querySelector('img.src-img')
  if (!canvas || !img) return
  const existing = slideStates.get(canvas)
  if (existing && existing.img === img) return
  if (existing) cancelAnimationFrame(existing.frame)
  const init = () => {
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const state = buildSlideState(canvas, img)
    slideStates.set(canvas, state)
    canvas.getContext('2d').drawImage(img, 0, 0)
  }
  if (img.complete && img.naturalWidth > 0) init()
  else img.addEventListener('load', init, { once: true })
}
function slideEnter(e) {
  const canvas = e.currentTarget.querySelector('canvas.tile-canvas')
  const state = canvas && slideStates.get(canvas)
  if (!state) return
  state.active = true
  cancelAnimationFrame(state.frame)
  drawSlideFrame(state)
}
function slideLeave(e) {
  const canvas = e.currentTarget.querySelector('canvas.tile-canvas')
  const state = canvas && slideStates.get(canvas)
  if (!state) return
  state.active = false
  state.mouse = { x: -999999, y: -999999 }
}
function slideMove(e) {
  const canvas = e.currentTarget.querySelector('canvas.tile-canvas')
  const state = canvas && slideStates.get(canvas)
  if (!state) return
  const rect = canvas.getBoundingClientRect()
  state.mouse = {
    x: (e.clientX - rect.left) * (state.iW / rect.width),
    y: (e.clientY - rect.top) * (state.iH / rect.height),
  }
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: false })
})
onBeforeUnmount(() => {
  window.removeEventListener('wheel', handleWheel)
  stopLoop()
  rowObservers.forEach((ro) => ro.disconnect())
})
</script>

<template>
  <div class="still-container">
    <!-- Sections: one row per live -->
    <div v-show="!isLightboxOpen" class="sections">
      <div
        v-for="live in lives"
        :key="live.id"
        class="live-section"
        :data-id="live.id"
        :ref="mountRow"
        @click="rowClick($event, live)"
      >
        <!-- Single canvas compositing all photos seamlessly -->
        <canvas class="row-canvas"></canvas>

        <div class="section-header">
          <span class="text title">{{ live.title }}, {{ live.date }}</span>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <Transition name="fade">
      <div
        v-if="isLightboxOpen"
        class="lightbox"
        @click.self="closeLightbox"
        @touchstart.passive="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend.passive="handleTouchEnd"
      >
        <div class="carousel-viewport">
          <div class="carousel-strip" :style="{ transform: `translateX(${stripOffsetVw}vw)` }">
            <div
              v-for="(url, idx) in currentLive.gallery"
              :key="url"
              class="slide"
              :class="{ 'slide--active': idx === currentIndex }"
              :ref="mountSlide"
              @mouseenter="slideEnter"
              @mouseleave="slideLeave"
              @mousemove="slideMove"
            >
              <img :src="url" class="src-img" crossorigin="anonymous" />
              <canvas class="tile-canvas contain-canvas"></canvas>
            </div>
          </div>
        </div>

        <div class="lightbox-meta">
          <span class="text small">{{ currentLive.title }}</span>
          <span class="text small muted"
            >{{ currentIndex + 1 }} / {{ currentLive.gallery.length }}</span
          >
        </div>
        <div class="close-btn text" @click="closeLightbox">Close</div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.still-container {
  padding: 8rem 1.5rem 2rem 1.5rem;
  min-height: 100dvh;
  box-sizing: border-box;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.live-section {
  cursor: pointer;
  width: 100%;
}

/* Single canvas fills full width, fixed height */
.row-canvas {
  display: block;
  width: 100%;
  height: 180px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

.sep {
  font-size: 0.72rem;
  opacity: 0.35;
}

.text {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #000;
  margin: 0;
  line-height: 1.3;
}
.title {
  font-size: 0.8rem;
}
.date {
  font-size: 0.72rem;
  opacity: 0.45;
}
.small {
  font-size: 0.8rem;
}
/* .muted {
  opacity: 0.5;
} */

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* Prevents iOS from intercepting horizontal swipes */
  touch-action: none;
}
.carousel-viewport {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.carousel-strip {
  display: flex;
  gap: 2vw;
  align-items: center;
  will-change: transform;
}
.slide {
  flex-shrink: 0;
  width: 72vw;
  height: 78vh;
  position: relative;
  cursor: crosshair;
  opacity: 0.3;
  transform: scale(0.88);
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}
.slide--active {
  opacity: 1;
  transform: scale(1);
}
.slide .src-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  pointer-events: none;
}
.contain-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.lightbox-meta {
  position: absolute;
  bottom: 2rem;
  left: 1.5rem;
  display: flex;
  flex-direction: column;
  z-index: 10;
}
.close-btn {
  position: absolute;
  bottom: 2rem;
  right: 1.5rem;
  cursor: pointer;
  font-size: 1rem;
  z-index: 10;
}
.close-btn:hover {
  text-decoration: line-through;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1440px) {
  .text {
    font-size: 1.5rem;
  }
  .title {
    font-size: 1.5rem;
  }
  .small {
    font-size: 1.5rem;
  }
  .close-btn {
    font-size: 1.5rem;
  }
}
</style>
