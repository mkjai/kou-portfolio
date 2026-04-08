<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const timeStr = ref('')
const dateStr = ref('')
let clockInterval = null

function updateClock() {
  const now = new Date()
  timeStr.value = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now)
  dateStr.value = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
    .format(now)
    .toUpperCase()
}

const weatherTemp = ref(null)
const weatherCode = ref(null)

function getWeatherLabel(code) {
  if (code === 0) return 'Sunny'
  if (code <= 2) return 'Partly Cloudy'
  if (code <= 3) return 'Cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 67) return 'Rainy'
  if (code <= 77) return 'Snowy'
  if (code <= 82) return 'Rainy'
  return 'Stormy'
}

const weatherLabel = computed(() =>
  weatherCode.value !== null ? getWeatherLabel(weatherCode.value) : null,
)

async function fetchWeather() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=34.05&longitude=-118.24&current=temperature_2m,weathercode&temperature_unit=celsius&timezone=America%2FLos_Angeles',
    )
    const data = await res.json()
    weatherTemp.value = Math.round(data.current.temperature_2m)
    weatherCode.value = data.current.weathercode
  } catch {}
}

onMounted(() => {
  updateClock()
  clockInterval = setInterval(updateClock, 1000)
  fetchWeather()
})
onBeforeUnmount(() => clearInterval(clockInterval))
</script>

<template>
  <div class="home">
    <div class="left-col">
      <p class="text">Kou</p>

      <p class="text bio small">
        Hi. I'm a Director and Colorist who lives for cinematic vibes and healthy obsessions with
        tiny details. Based in Los Angeles, I mainly shoot commercials, music videos, and short
        films, but when I'm not behind a lens, I usually design websites or shoot stills for artists
        or passions.
        <br />
        <br />
        I'm constantly bouncing between the States and Japan, so I'm basically a professional
        jet-lagged filmmaker available for work in both countries. This website is still a work in
        progress. If something looks broken, it is a feature for now.
      </p>

      <p class="text jp bio small">
        ディレクター／カラリスト。 シネマティックな映像美と、ディテールへの執着心が私の原動力です。
        <br />
        <br />
        広告やMV制作の傍ら、クリエイター向けのサイトデザインやフォトグラファーとしても活動しています。日本とアメリカの二拠点生活を送っているため、年中時差ボケ気味ではありますが、フットワーク軽く両国で仕事をお受けしています。
      </p>

      <div class="contact">
        <p class="text small">Contact</p>
        <br />
        <a
          href="/cdn-cgi/l/email-protection#d4bcb1b8b8bb94bfbba1f9a3bba6bfa7fabdbab2bb"
          class="text link small"
          ><span class="__cf_email__" data-cfemail="d1b9b4bdbdbe91babea4fca6bea3baa2ffb8bfb7be"
            >[email&#160;protected]</span
          ></a
        >
        <a href="#" class="text link small">VIMEO (TBD)</a>
        <a href="https://www.instagram.com/kou._.works/" target="_blank" class="text link small"
          >Instagram</a
        >
      </div>
    </div>

    <div class="local-info" v-if="timeStr">
      <span class="text small">Los Angeles</span>
      <span class="text small" v-if="weatherTemp !== null"
        >{{ weatherLabel }} {{ weatherTemp }}°C</span
      >
      <span class="text small">{{ dateStr }}</span>
      <span class="text small">{{ timeStr }}</span>
    </div>
  </div>
</template>

<style scoped>
.home {
  /* 1. Change from fixed to relative/min-height */
  position: relative;
  min-height: 100dvh; /* Use dvh to account for mobile browser bars */
  width: 100%;

  /* 2. Enable vertical scrolling and allow interaction */
  overflow-y: auto;
  pointer-events: auto; /* Crucial: 'none' stops scroll and clicks */

  /* 3. Use Flexbox for vertical centering when there IS space */
  display: flex;
  align-items: center;

  z-index: 1;
  box-sizing: border-box;
  padding: 4rem 0; /* Adds top/bottom padding so content doesn't hit edges when scrolling */
}

.left-col {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  pointer-events: none;
}

.left-col > * {
  /* Ensure children (links) are still clickable */
  pointer-events: auto;
}

.local-info {
  /* 5. Keep this pinned to the corner relative to the screen, 
     not the scrolling content */
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
}

.text {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1.15rem;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.2;
  color: #000;
  margin: 0;
  display: block;
}

.text.jp {
  font-family: 'Helvetica Neue', Helvetica, 'Hiragino Sans', 'Yu Gothic', sans-serif;
  letter-spacing: 0.01em;
}

.text.bio {
  max-width: clamp(42ch, 50vw, 72ch);
  line-height: 1.6;
}

.text.small {
  font-size: 0.85rem;
}

.text.dim {
  opacity: 0.4;
}

.text.link {
  text-decoration: none;
  pointer-events: auto;
}

.text.link:hover {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.left-col {
  position: absolute;
  left: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  pointer-events: none;
}

/* .circle {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #000;
  flex-shrink: 0;
} */

.contact {
  display: flex;
  flex-direction: column;
}

.local-info {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
}

@media (max-width: 768px) {
  .text {
    font-size: 3rem;
  }
  .text.small {
    font-size: 3rem;
  }
}
</style>
