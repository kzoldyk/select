<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    color1?: string
    color2?: string
    color3?: string
    animate?: 'on' | 'off'
    grain?: 'on' | 'off'
    speed?: number
  }>(),
  {
    color1: '#73bfc4',
    color2: '#ff810a',
    color3: '#8da0ce',
    animate: 'on',
    grain: 'on',
    speed: 0.3,
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null
let width = 0
let height = 0

// Track circle states for the animation
interface Circle {
  x: number
  y: number
  baseX: number
  baseY: number
  angleX: number
  angleY: number
  speedX: number
  speedY: number
  radius: number
  color: { r: number; g: number; b: number }
  targetColor: { r: number; g: number; b: number }
}

const circles: Circle[] = []

// Helper to parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '')
  const num = parseInt(cleanHex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

// Helper to lerp colors
function lerp(start: number, end: number, amt: number): number {
  return (1 - amt) * start + amt * end
}

// Initialize the circles
function initCircles() {
  const rgb1 = hexToRgb(props.color1)
  const rgb2 = hexToRgb(props.color2)
  const rgb3 = hexToRgb(props.color3)

  circles[0] = {
    x: 0.3,
    y: 0.4,
    baseX: 0.3,
    baseY: 0.4,
    angleX: 0,
    angleY: Math.PI / 3,
    speedX: 0.004 * props.speed,
    speedY: 0.005 * props.speed,
    radius: 0.5, // Relative to canvas size
    color: { ...rgb1 },
    targetColor: { ...rgb1 },
  }

  circles[1] = {
    x: 0.7,
    y: 0.3,
    baseX: 0.7,
    baseY: 0.3,
    angleX: Math.PI / 4,
    angleY: 0,
    speedX: 0.003 * props.speed,
    speedY: 0.004 * props.speed,
    radius: 0.6,
    color: { ...rgb2 },
    targetColor: { ...rgb2 },
  }

  circles[2] = {
    x: 0.5,
    y: 0.7,
    baseX: 0.5,
    baseY: 0.7,
    angleX: Math.PI / 2,
    angleY: Math.PI / 6,
    speedX: 0.005 * props.speed,
    speedY: 0.003 * props.speed,
    radius: 0.55,
    color: { ...rgb3 },
    targetColor: { ...rgb3 },
  }
}

// Watch props for color updates and update targets
watch(
  () => [props.color1, props.color2, props.color3],
  ([c1, c2, c3]) => {
    if (circles.length === 3) {
      circles[0].targetColor = hexToRgb(c1)
      circles[1].targetColor = hexToRgb(c2)
      circles[2].targetColor = hexToRgb(c3)
    }
  }
)

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  width = canvas.width = rect.width
  height = canvas.height = rect.height
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  // Clear canvas to black
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  // Draw circles with compositing
  ctx.globalCompositeOperation = 'screen'

  circles.forEach((circle) => {
    // Lerp color towards target
    circle.color.r = lerp(circle.color.r, circle.targetColor.r, 0.08)
    circle.color.g = lerp(circle.color.g, circle.targetColor.g, 0.08)
    circle.color.b = lerp(circle.color.b, circle.targetColor.b, 0.08)

    // Update positions using sine waves for fluid motion
    if (props.animate === 'on') {
      circle.angleX += circle.speedX
      circle.angleY += circle.speedY
      circle.x = circle.baseX + Math.sin(circle.angleX) * 0.15
      circle.y = circle.baseY + Math.cos(circle.angleY) * 0.15
    }

    const cx = circle.x * width
    const cy = circle.y * height
    const radius = circle.radius * Math.max(width, height)

    // Create radial gradient for a soft, glowing blob
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    const colorStr = `rgba(${Math.round(circle.color.r)}, ${Math.round(circle.color.g)}, ${Math.round(circle.color.b)}`
    grad.addColorStop(0, `${colorStr}, 0.8)`)
    grad.addColorStop(0.3, `${colorStr}, 0.4)`)
    grad.addColorStop(0.7, `${colorStr}, 0.1)`)
    grad.addColorStop(1, `${colorStr}, 0)`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  })

  // Restore compositing
  ctx.globalCompositeOperation = 'source-over'
}

function animateLoop() {
  draw()
  animationFrameId = requestAnimationFrame(animateLoop)
}

onMounted(() => {
  resizeCanvas()
  initCircles()
  window.addEventListener('resize', resizeCanvas)
  animateLoop()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <div class="shader-gradient-container absolute inset-0 overflow-hidden bg-black select-none pointer-events-none">
    <!-- Fluid canvas with large CSS blur for premium smooth mixing -->
    <canvas
      ref="canvasRef"
      class="w-full h-full filter blur-[100px] sm:blur-[140px] scale-125 opacity-70 transform-gpu"
    ></canvas>

    <!-- Subtle Grid overlay to match design -->
    <div class="absolute inset-0 bg-grid-pattern opacity-12 mix-blend-overlay"></div>

    <!-- Radial vignette mask to make the gradient pool only at the top and blend out to solid black at the bottom -->
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#090A0C]/50 to-[#090A0C]"></div>

    <!-- Organic Grain Noise Overlay -->
    <div
      v-if="props.grain === 'on'"
      class="absolute inset-0 noise-grain opacity-[0.045] pointer-events-none mix-blend-screen transform-gpu"
    ></div>

    <!-- SVG Noise Filter Definition -->
    <svg class="hidden" aria-hidden="true">
      <filter id="shaderNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.8 0" />
      </filter>
    </svg>
  </div>
</template>

<style scoped>
.shader-gradient-container {
  z-index: 0;
}

.bg-grid-pattern {
  background-size: 32px 32px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 1px, transparent 1px);
}

.noise-grain {
  background-color: transparent;
  filter: url(#shaderNoise);
  width: 100%;
  height: 100%;
}
</style>
