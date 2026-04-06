<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

const canvasRef = ref(null)
let renderer, scene, camera, mesh, animId, resizeHandler

onMounted(() => {
  const el = canvasRef.value
  let W = window.innerWidth
  let H = window.innerHeight

  renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: false })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(W, H)

  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const vertexShader = /* glsl */ `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform vec2  u_resolution;
    uniform float u_time;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i),             hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * smoothNoise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      uv.y = 1.0 - uv.y;

      float aspect = u_resolution.x / u_resolution.y;
      vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);

      // ---- Tile grid ----
      // Tile size relative to viewport height so it stays consistent on all screens.
      // 22 tiles across the height → circle ~70% of min(w,h) feels right with circleR=0.70
      float gridCount = 30.0;
      float tileSize  = 1.0 / gridCount;

      // Circle radius in aspect-corrected space.
      // 0.35 * aspect fills ~70% of the viewport height as a circle.
      float circleR = 0.75;

      vec2 tileIdx = floor(uv / tileSize);

      // Pixel-art circle: test tile centre
      vec2 tileCenUV  = (tileIdx + 0.5) * tileSize;
      vec2 tileCenCen = (tileCenUV - 0.5) * vec2(aspect, 1.0);
      if (length(tileCenCen) > circleR) {
        gl_FragColor = vec4(0.0);
        return;
      }

      // ---- Sample wave at TILE CENTRE ----
      float t = u_time * 0.20;
      vec2 tileCenWorld = tileCenCen * 2.2;
      float density = fbm(tileCenWorld + vec2(t * 0.5, t * 0.3));
      density = smoothstep(0.15, 0.85, density);

      // ---- Fine pixel grain — uniform within each tile ----
      float pixelRand = hash(floor(gl_FragCoord.xy));
      if (pixelRand > density) {
        gl_FragColor = vec4(0.0);
        return;
      }

      float brightness = mix(0.70, 0.16, density);
      gl_FragColor = vec4(vec3(brightness), 1.0);
    }
  `

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_resolution: {
        value: new THREE.Vector2(W * window.devicePixelRatio, H * window.devicePixelRatio),
      },
      u_time: { value: 0.0 },
    },
    transparent: true,
  })

  mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(mesh)

  const clock = new THREE.Clock()
  const animate = () => {
    animId = requestAnimationFrame(animate)
    material.uniforms.u_time.value = clock.getElapsedTime()
    renderer.render(scene, camera)
  }
  animate()

  resizeHandler = () => {
    W = window.innerWidth
    H = window.innerHeight
    renderer.setSize(W, H)
    material.uniforms.u_resolution.value.set(
      W * window.devicePixelRatio,
      H * window.devicePixelRatio,
    )
  }
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', resizeHandler)
  renderer?.dispose()
})
</script>

<template>
  <div class="bg-wrapper">
    <canvas ref="canvasRef" class="bg-canvas"></canvas>
  </div>
</template>

<style scoped>
.bg-wrapper {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.bg-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
