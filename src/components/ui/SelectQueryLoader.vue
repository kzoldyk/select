<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    message?: string
    submessage?: string
    elapsed?: string
    showPulseRing?: boolean
  }>(),
  {
    size: 'md',
    message: '',
    submessage: '',
    elapsed: '',
    showPulseRing: true,
  }
)

const dimensions = computed(() => {
  switch (props.size) {
    case 'sm':
      return { width: 36, height: 42, viewBox: '0 0 48 56' }
    case 'lg':
      return { width: 72, height: 84, viewBox: '0 0 48 56' }
    case 'md':
    default:
      return { width: 52, height: 60, viewBox: '0 0 48 56' }
  }
})
</script>

<template>
  <div class="select-query-loader flex flex-col items-center justify-center select-none" :class="[`loader-${size}`]">
    <!-- Ambient Glow / Pulse Aura -->
    <div class="relative flex items-center justify-center">
      <div
        v-if="showPulseRing"
        class="absolute -inset-4 rounded-full bg-primary/10 blur-md pointer-events-none animate-pulse-glow"
      />

      <!-- Custom Animated SQL Database Platters SVG -->
      <svg
        :width="dimensions.width"
        :height="dimensions.height"
        :viewBox="dimensions.viewBox"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="relative z-10 overflow-visible"
      >
        <defs>
          <!-- Neon linear gradient for platters -->
          <linearGradient id="selectDiskGradient" x1="4" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.25" />
            <stop offset="50%" stop-color="var(--primary)" stop-opacity="0.85" />
            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.25" />
          </linearGradient>

          <!-- Top rim highlight -->
          <linearGradient id="selectRimGradient" x1="4" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.4" />
            <stop offset="50%" stop-color="var(--primary)" stop-opacity="1" />
            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.4" />
          </linearGradient>

          <!-- Moving laser scan beam gradient -->
          <linearGradient id="selectLaserGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0" />
            <stop offset="50%" stop-color="var(--primary)" stop-opacity="0.95" />
            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Platter 3 (Bottom) -->
        <g class="disk-layer disk-bottom">
          <path
            d="M6 36 C6 31 42 31 42 36 V42 C42 47 6 47 6 42 Z"
            fill="currentColor"
            class="text-muted/60"
            stroke="var(--primary)"
            stroke-opacity="0.35"
            stroke-width="1.2"
          />
          <ellipse
            cx="24"
            cy="36"
            rx="18"
            ry="5.5"
            fill="url(#selectDiskGradient)"
            stroke="url(#selectRimGradient)"
            stroke-width="1.2"
          />
        </g>

        <!-- Platter 2 (Middle) -->
        <g class="disk-layer disk-middle">
          <path
            d="M6 23 C6 18 42 18 42 23 V29 C42 34 6 34 6 29 Z"
            fill="currentColor"
            class="text-muted/70"
            stroke="var(--primary)"
            stroke-opacity="0.45"
            stroke-width="1.2"
          />
          <ellipse
            cx="24"
            cy="23"
            rx="18"
            ry="5.5"
            fill="url(#selectDiskGradient)"
            stroke="url(#selectRimGradient)"
            stroke-width="1.2"
          />
        </g>

        <!-- Platter 1 (Top) -->
        <g class="disk-layer disk-top">
          <path
            d="M6 10 C6 5 42 5 42 10 V16 C42 21 6 21 6 16 Z"
            fill="currentColor"
            class="text-muted/80"
            stroke="var(--primary)"
            stroke-opacity="0.55"
            stroke-width="1.2"
          />
          <ellipse
            cx="24"
            cy="10"
            rx="18"
            ry="5.5"
            fill="url(#selectDiskGradient)"
            stroke="url(#selectRimGradient)"
            stroke-width="1.4"
          />
          <!-- Center Database Spindle Core -->
          <ellipse
            cx="24"
            cy="10"
            rx="5.5"
            ry="1.8"
            fill="var(--background)"
            stroke="var(--primary)"
            stroke-width="1"
            class="animate-pulse"
          />
        </g>

        <!-- Vertical Laser Query Index Scan Beam -->
        <rect
          x="3"
          y="6"
          width="42"
          height="7"
          rx="3.5"
          fill="url(#selectLaserGradient)"
          class="laser-beam pointer-events-none"
        />

        <!-- Side Read/Write Activity Blinks -->
        <circle cx="9" cy="13" r="1.5" fill="var(--primary)" class="activity-led led-1" />
        <circle cx="9" cy="26" r="1.5" fill="var(--primary)" class="activity-led led-2" />
        <circle cx="9" cy="39" r="1.5" fill="var(--primary)" class="activity-led led-3" />
      </svg>
    </div>

    <!-- Message & Timer Labels -->
    <div v-if="message || elapsed" class="mt-3 flex flex-col items-center gap-1">
      <div class="flex items-center gap-2">
        <span v-if="message" class="text-xs font-semibold tracking-wide text-foreground">
          {{ message }}
        </span>
        <span
          v-if="elapsed"
          class="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/80 border border-border/70"
        >
          {{ elapsed }}
        </span>
      </div>
      <p v-if="submessage" class="text-[11px] font-mono text-muted-foreground/80 max-w-sm truncate text-center">
        {{ submessage }}
      </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes laserSweep {
  0% {
    transform: translateY(0px);
    opacity: 0.2;
  }
  50% {
    transform: translateY(32px);
    opacity: 0.95;
  }
  100% {
    transform: translateY(0px);
    opacity: 0.2;
  }
}

@keyframes pulseGlow {
  0%, 100% {
    transform: scale(0.92);
    opacity: 0.35;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.75;
  }
}

@keyframes ledBlink {
  0%, 100% {
    opacity: 0.2;
  }
  35%, 65% {
    opacity: 1;
    filter: drop-shadow(0 0 3px var(--primary));
  }
}

.laser-beam {
  animation: laserSweep 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.animate-pulse-glow {
  animation: pulseGlow 2.4s ease-in-out infinite;
}

.activity-led {
  animation: ledBlink 1.2s ease-in-out infinite;
}

.led-1 {
  animation-delay: 0s;
}

.led-2 {
  animation-delay: 0.4s;
}

.led-3 {
  animation-delay: 0.8s;
}

/* Subtle staggered platter breathing */
.disk-top {
  animation: diskFloat 2.8s ease-in-out infinite;
}
.disk-middle {
  animation: diskFloat 2.8s ease-in-out infinite 0.2s;
}
.disk-bottom {
  animation: diskFloat 2.8s ease-in-out infinite 0.4s;
}

@keyframes diskFloat {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-0.8px);
  }
}
</style>
