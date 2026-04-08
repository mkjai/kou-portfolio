<script setup>
// ─── Video data ───────────────────────────────────────────────────────────────
// Add your videos here. provider: 'youtube' or 'vimeo'
// id: the video ID from the URL
//   YouTube: https://www.youtube.com/watch?v=XXXX → id: 'XXXX'
//   Vimeo:   https://vimeo.com/XXXX              → id: 'XXXX'

const videos = [
  {
    id: 1,
    provider: 'youtube',
    videoId: 'ikGOxRW9FSI',
    title: 'くゆる - YOU ; mope / Live ＠ERA',
  },
  {
    id: 2,
    provider: 'vimeo',
    videoId: '1135239722',
    title: '洋服の青山　レディース　美ジ楽スーツ (2nd AC)',
  },
  {
    id: 3,
    provider: 'youtube',
    videoId: '',
    title: 'Pacific Palm Resort Spa (Coming Soon)',
  },
  {
    id: 4,
    provider: 'youtube',
    videoId: '',
    title: 'group_nonse - Lively Party (Coming Soon)',
  },
  {
    id: 5,
    provider: 'youtube',
    videoId: '',
    title: 'Student Short Film (Coming Soon)',
  },
  {
    id: 6,
    provider: 'youtube',
    videoId: '',
    title: 'Student Short Film (Coming Soon)',
  },
  {
    id: 7,
    provider: 'vimeo',
    videoId: '',
    title: 'Showreel (New Version Coming Soon)',
  },
]

function embedUrl(video) {
  if (video.provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&modestbranding=1`
  }
  if (video.provider === 'vimeo') {
    return `https://player.vimeo.com/video/${video.videoId}?title=0&byline=0&portrait=0`
  }
  return ''
}
</script>

<template>
  <div class="motion-container">
    <div class="video-grid">
      <div v-for="video in videos" :key="video.id" class="video-item">
        <div class="video-wrapper">
          <iframe
            :src="embedUrl(video)"
            :title="video.title"
            frameborder="0"
            allow="
              accelerometer;
              autoplay;
              clipboard-write;
              encrypted-media;
              gyroscope;
              picture-in-picture;
            "
            allowfullscreen
          ></iframe>
        </div>
        <div class="video-meta">
          <span class="text title">{{ video.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.motion-container {
  padding: 8rem 1.5rem 4rem 1.5rem;
  min-height: 100dvh;
  box-sizing: border-box;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 0.5rem;
}

/* 1 column on narrow screens */
@media (max-width: 640px) {
  .video-grid {
    grid-template-columns: 1fr;
  }
}

.video-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* 16:9 aspect ratio wrapper */
.video-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 2rem;
  background: #111;
}

.video-wrapper iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.video-meta {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin-top: 0.2rem;
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
.sep {
  font-size: 0.72rem;
  opacity: 0.35;
}
.date {
  font-size: 0.72rem;
  opacity: 0.45;
}

@media (max-width: 768px) {
  .title {
    font-size: 5rem;
  }
}
</style>
