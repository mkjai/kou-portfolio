<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// ─── Auto-load photos from src/assets/stills/ using Vite glob ───────────────
//
// FOLDER STRUCTURE:
//   src/assets/stills/
//     01_Show-Title_2026.04.06/
//       001.jpg   ← becomes the cover (first alphabetically)
//       002.jpg
//       003.jpg
//     02_Another-Show_2026.03.20/
//       001.jpg
//       002.jpg
//
// Folder name format: {order}_{Title}_{Date}
//   - Use hyphens for spaces in title
//   - {order} ensures display sort order
//   - {Date} format is free-form (shown as-is)
//
// Photos inside each folder are sorted alphabetically — name them
// 001, 002, 003... to control order. The first file becomes the cover.

const allImages = import.meta.glob(
  '/src/assets/stills/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true },
)

function loadLives() {
  const folders = {}

  for (const path in allImages) {
    const segments = path.split('/')
    const filename = segments[segments.length - 1]
    const folderName = segments[segments.length - 2]
    if (!folderName || folderName === 'stills') continue

    if (!folders[folderName]) folders[folderName] = []
    folders[folderName].push({
      filename,
      url: allImages[path].default || allImages[path],
    })
  }

  return Object.entries(folders)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folderName, photos]) => {
      // Sort photos alphabetically so 001 comes first
      photos.sort((a, b) => a.filename.localeCompare(b.filename))

      // Parse folder name: {order}_{Title}_{Date}
      const parts = folderName.split('_')
      const title = (parts[1] || 'Untitled').replace(/-/g, ' ')
      const date = parts[2] || ''

      return {
        id: folderName,
        title,
        date,
        cover: photos[0].url,
        gallery: photos.map((p) => p.url),
      }
    })
}

const lives = ref(loadLives())

// ─── Lightbox ────────────────────────────────────────────────────────────────
const isLightboxOpen = ref(false)
const currentLive = ref(null)
const currentIndex = ref(0)

const openLightbox = (live) => {
  currentLive.value = live
  currentIndex.value = 0
  isLightboxOpen.value = true
  document.body.style.overflow = 'hidden'
}
const closeLightbox = () => {
  isLightboxOpen.value = false
  document.body.style.overflow = ''
}
const nextPhoto = () => {
  if (currentIndex.value < currentLive.value.gallery.length - 1) currentIndex.value++
}
const prevPhoto = () => {
  if (currentIndex.value > 0) currentIndex.value--
}
const handleScroll = (e) => {
  if (!isLightboxOpen.value) return
  e.deltaY > 0 ? nextPhoto() : prevPhoto()
}
onMounted(() => window.addEventListener('wheel', handleScroll))
onBeforeUnmount(() => window.removeEventListener('wheel', handleScroll))

// ─── Tile-displacement glitch effect ─────────────────────────────────────────
//
// KEY DESIGN:
// - Canvas pixel size  = image natural size  (source-of-truth, never changes)
// - Canvas CSS size    = display size (CSS scales it, like img with object-fit)
// - Tile coordinates are always in image-natural space
// - Mouse coords are scaled from display-px → image-natural-px
// - For lightbox: image is letterboxed (contain), so we compute the
//   letterbox rect and only interact with tiles inside it

const COLS = 10
const ROWS = 8
const RADIUS = 90 // influence radius in IMAGE-space px (scaled per image)
const MAX_DISP = 14 // max tile displacement in image-space px
const LERP = 0.14

const states = new Map()

function buildState(canvasEl, imgEl, isCover) {
  const iW = imgEl.naturalWidth
  const iH = imgEl.naturalHeight
  const tileW = iW / COLS
  const tileH = iH / ROWS

  const seeds = []
  for (let i = 0; i < COLS * ROWS; i++) {
    const angle = Math.random() * Math.PI * 2
    seeds.push({ dx: Math.cos(angle), dy: Math.sin(angle) })
  }

  return {
    canvasEl,
    imgEl,
    isCover,
    iW,
    iH,
    tileW,
    tileH,
    seeds,
    disp: new Float32Array(COLS * ROWS * 2),
    mouse: { x: -999999, y: -999999 }, // image-space coords
    frame: null,
    active: false,
  }
}

// For lightbox: compute the letterbox rect (object-fit:contain) in image-space
function letterboxRect(imgW, imgH, contW, contH) {
  const scale = Math.min(contW / imgW, contH / imgH)
  const dw = imgW * scale
  const dh = imgH * scale
  const ox = (contW - dw) / 2
  const oy = (contH - dh) / 2
  return { ox, oy, dw, dh, scale }
}

function drawFrame(state) {
  const { canvasEl, imgEl, isCover, iW, iH, tileW, tileH, seeds, disp, mouse } = state
  const ctx = canvasEl.getContext('2d')

  // Compute influence radius scaled to image space
  // For thumbnails radius is in image-px; for lightbox same
  const radius = RADIUS * (iW / 220) // scale radius proportionally to image size

  // Update displacements
  let changed = false
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      const tileCX = (c + 0.5) * tileW
      const tileCY = (r + 0.5) * tileH
      const dist = Math.hypot(mouse.x - tileCX, mouse.y - tileCY)
      const t = Math.max(0, 1 - dist / radius)
      const str = t * t * MAX_DISP * (iW / 220)

      const tx = seeds[i].dx * str
      const ty = seeds[i].dy * str
      const px = i * 2
      const py = i * 2 + 1
      disp[px] += (tx - disp[px]) * LERP
      disp[py] += (ty - disp[py]) * LERP
      if (Math.abs(disp[px]) > 0.15 || Math.abs(disp[py]) > 0.15) changed = true
    }
  }

  // Draw
  ctx.clearRect(0, 0, iW, iH)

  if (isCover) {
    // Thumbnail: fills canvas fully (object-fit: cover via CSS)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        const sx = c * tileW
        const sy = r * tileH
        ctx.save()
        ctx.translate(disp[i * 2], disp[i * 2 + 1])
        ctx.drawImage(imgEl, sx, sy, tileW, tileH, sx, sy, tileW, tileH)
        ctx.restore()
      }
    }
  } else {
    // Lightbox: letterboxed — draw black background then centered image
    ctx.fillStyle = 'rgba(240,240,240,0.97)'
    ctx.fillRect(0, 0, iW, iH)
    // Just draw tiled — the canvas CSS handles scaling/centering
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        const sx = c * tileW
        const sy = r * tileH
        ctx.save()
        ctx.translate(disp[i * 2], disp[i * 2 + 1])
        ctx.drawImage(imgEl, sx, sy, tileW, tileH, sx, sy, tileW, tileH)
        ctx.restore()
      }
    }
  }

  if (changed || state.active) {
    state.frame = requestAnimationFrame(() => drawFrame(state))
  }
}

function setupCanvas(canvasEl, imgEl, isCover) {
  const existing = states.get(canvasEl)
  if (existing && existing.imgEl === imgEl) return

  if (existing) cancelAnimationFrame(existing.frame)

  const init = () => {
    // Canvas pixel size = image natural size
    canvasEl.width = imgEl.naturalWidth
    canvasEl.height = imgEl.naturalHeight

    const state = buildState(canvasEl, imgEl, isCover)
    states.set(canvasEl, state)

    // Draw initial clean image
    const ctx = canvasEl.getContext('2d')
    ctx.drawImage(imgEl, 0, 0)
  }

  if (imgEl.complete && imgEl.naturalWidth > 0) init()
  else imgEl.addEventListener('load', init, { once: true })
}

function getMouseInImageSpace(e, canvasEl, state) {
  const rect = canvasEl.getBoundingClientRect()
  // scale from display-px to image-natural-px
  const scaleX = state.iW / rect.width
  const scaleY = state.iH / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

function onEnter(e) {
  const canvas = e.currentTarget.querySelector('canvas.tile-canvas')
  const state = canvas && states.get(canvas)
  if (!state) return
  state.active = true
  cancelAnimationFrame(state.frame)
  drawFrame(state)
}

function onLeave(e) {
  const canvas = e.currentTarget.querySelector('canvas.tile-canvas')
  const state = canvas && states.get(canvas)
  if (!state) return
  state.active = false
  state.mouse = { x: -999999, y: -999999 }
}

function onMove(e) {
  const canvas = e.currentTarget.querySelector('canvas.tile-canvas')
  const state = canvas && states.get(canvas)
  if (!state) return
  state.mouse = getMouseInImageSpace(e, canvas, state)
}

function mountGrid(el) {
  if (!el) return
  const canvas = el.querySelector('canvas.tile-canvas')
  const img = el.querySelector('img.src-img')
  if (canvas && img) setupCanvas(canvas, img, true)
}

function mountLightbox(el) {
  if (!el) return
  const canvas = el.querySelector('canvas.tile-canvas')
  const img = el.querySelector('img.src-img')
  if (canvas && img) setupCanvas(canvas, img, false)
}
</script>

<template>
  <div class="still-container">
    <!-- Grid -->
    <div v-show="!isLightboxOpen" class="grid">
      <div
        v-for="live in lives"
        :key="live.id"
        class="live-item"
        :ref="mountGrid"
        @click="openLightbox(live)"
        @mouseenter="onEnter"
        @mouseleave="onLeave"
        @mousemove="onMove"
      >
        <div class="image-wrapper">
          <img :src="live.cover" :alt="live.name" class="src-img" crossorigin="anonymous" />
          <canvas class="tile-canvas cover-canvas"></canvas>
        </div>
        <div class="live-details">
          <p class="text title">{{ live.title }}</p>
          <p class="text date">{{ live.date }}</p>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <Transition name="fade">
      <div v-if="isLightboxOpen" class="lightbox" @click.self="closeLightbox">
        <div
          class="photo-stage"
          :ref="mountLightbox"
          @mouseenter="onEnter"
          @mouseleave="onLeave"
          @mousemove="onMove"
        >
          <img :src="currentLive.gallery[currentIndex]" class="src-img" crossorigin="anonymous" />
          <canvas class="tile-canvas contain-canvas"></canvas>
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
  padding: 8rem 3rem 4rem 3rem;
  min-height: 100dvh;
  box-sizing: border-box;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 220px);
  gap: 0.4rem;
}

.live-item {
  width: 220px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.image-wrapper {
  width: 220px;
  height: 147px;
  overflow: hidden;
  position: relative;
}

.src-img {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* cover-canvas: fills its 220×147 container, canvas content fills whole image */
.cover-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

/* contain-canvas: preserves aspect ratio, letterboxes within photo-stage */
.contain-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.live-details {
  margin-top: 0.4rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.live-item:hover .live-details {
  opacity: 1;
}

.meta-row {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.text {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #000;
  margin: 0;
  line-height: 1.3;
}
.artist {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}
.sep {
  font-size: 0.8rem;
  opacity: 0.4;
}
.name {
  font-size: 0.8rem;
  opacity: 0.7;
}
.date {
  font-size: 0.72rem;
  opacity: 0.45;
}
.small {
  font-size: 0.8rem;
}
.muted {
  opacity: 0.5;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(240, 240, 240, 0.97);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-stage {
  position: relative;
  /* 
    Use max-width/max-height with auto on the other axis so the stage
    itself never distorts the image. The canvas inside uses object-fit:contain.
  */
  max-width: 88vw;
  max-height: 88vh;
  width: 88vw;
  height: 88vh;
  overflow: hidden;
  cursor: crosshair;
}

.lightbox-meta {
  position: absolute;
  bottom: 2rem;
  left: 3rem;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  bottom: 2rem;
  right: 3rem;
  cursor: pointer;
  font-size: 1rem;
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
</style>
