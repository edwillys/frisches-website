<script setup lang="ts">
import { computed, onMounted, ref, watch, type PropType } from 'vue'

type MobileTransferEstimate = {
  label: string
  seconds: number
}

type AudioDebugSnapshot = {
  trackId: string | null
  loading: boolean
  loadingReason: string
  currentTrackTransferBytes: number
  currentTrackTransferLabel: string
  mobileTransferEstimates: MobileTransferEstimate[]
  connection: {
    effectiveType: string | null
    downlinkMbps: number | null
    rttMs: number | null
    saveData: boolean | null
  } | null
  masterResource: {
    transferBytes: number
    encodedBodyBytes: number
    decodedBodyBytes: number
    durationMs: number
    src: string
  } | null
  totalSessionTransferBytes: number
  stems: {
    active: boolean
    prebuffered: boolean
    currentTrackPaths: string[]
    currentTrackTransferredBytes: number
    currentTrackDecodedBytes: number
    currentCompressedCacheBytes: number
    currentDecodedCacheBytes: number
    totalTransferredBytes: number
    totalDecodedBytes: number
    assets: Array<{
      assetPath: string
      transferredBytes: number
      decodedBytes: number
      fetchCount: number
    }>
  }
}

const props = defineProps({
  snapshot: {
    type: Object as PropType<AudioDebugSnapshot>,
    required: true,
  },
})

const AUDIO_DEBUG_HUD_COLLAPSED_KEY = 'frisches:audio-debug-hud:collapsed'
const isCollapsed = ref(false)

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${Math.round(bytes)} B`
}

const connectionSummary = computed(() => {
  if (!props.snapshot.connection) return 'No network info'

  const { effectiveType, downlinkMbps, rttMs, saveData } = props.snapshot.connection
  return [
    effectiveType ?? 'unknown',
    downlinkMbps ? `${downlinkMbps} Mbps` : null,
    rttMs ? `${rttMs} ms RTT` : null,
    saveData ? 'Save-Data' : null,
  ]
    .filter(Boolean)
    .join(' • ')
})

const topAssets = computed(() => props.snapshot.stems.assets.slice(0, 3))
const loadingLabel = computed(() =>
  props.snapshot.loading ? `Loading (${props.snapshot.loadingReason})` : 'Stable'
)

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value
}

onMounted(() => {
  if (typeof window === 'undefined') return
  isCollapsed.value = window.localStorage.getItem(AUDIO_DEBUG_HUD_COLLAPSED_KEY) === 'true'
})

watch(isCollapsed, (collapsed) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUDIO_DEBUG_HUD_COLLAPSED_KEY, collapsed ? 'true' : 'false')
})
</script>

<template>
  <aside
    class="audio-debug-hud"
    data-testid="audio-debug-hud"
    :data-collapsed="isCollapsed ? 'true' : 'false'"
    aria-live="polite"
  >
    <header class="audio-debug-hud__header">
      <div>
        <p class="audio-debug-hud__eyebrow">Audio Debug</p>
        <h2 class="audio-debug-hud__title">{{ snapshot.trackId ?? 'No track' }}</h2>
      </div>
      <div class="audio-debug-hud__header-actions">
        <span class="audio-debug-hud__status" :data-loading="snapshot.loading ? 'true' : 'false'">
          {{ loadingLabel }}
        </span>
        <button
          class="audio-debug-hud__toggle"
          type="button"
          :aria-expanded="!isCollapsed"
          :aria-label="isCollapsed ? 'Expand audio debug overlay' : 'Collapse audio debug overlay'"
          data-testid="audio-debug-hud-toggle"
          @click="toggleCollapsed"
        >
          <span
            class="audio-debug-hud__toggle-glyph"
            :data-collapsed="isCollapsed ? 'true' : 'false'"
          >
            V
          </span>
        </button>
      </div>
    </header>

    <div v-if="!isCollapsed" class="audio-debug-hud__body" data-testid="audio-debug-hud-body">
      <dl class="audio-debug-hud__metrics">
        <div>
          <dt>Track transfer</dt>
          <dd>{{ snapshot.currentTrackTransferLabel }}</dd>
        </div>
        <div>
          <dt>Session total</dt>
          <dd>{{ formatBytes(snapshot.totalSessionTransferBytes) }}</dd>
        </div>
        <div>
          <dt>Stem assets</dt>
          <dd>{{ snapshot.stems.currentTrackPaths.length }}</dd>
        </div>
        <div>
          <dt>Stem compressed</dt>
          <dd>{{ formatBytes(snapshot.stems.currentTrackTransferredBytes) }}</dd>
        </div>
        <div>
          <dt>Stem decoded</dt>
          <dd>{{ formatBytes(snapshot.stems.currentTrackDecodedBytes) }}</dd>
        </div>
        <div>
          <dt>Cache compressed</dt>
          <dd>{{ formatBytes(snapshot.stems.currentCompressedCacheBytes) }}</dd>
        </div>
        <div>
          <dt>Cache decoded</dt>
          <dd>{{ formatBytes(snapshot.stems.currentDecodedCacheBytes) }}</dd>
        </div>
      </dl>

      <p class="audio-debug-hud__connection">{{ connectionSummary }}</p>

      <div v-if="snapshot.masterResource" class="audio-debug-hud__section">
        <p class="audio-debug-hud__section-title">Master resource</p>
        <p class="audio-debug-hud__section-copy">
          {{ formatBytes(snapshot.masterResource.transferBytes) }} •
          {{ snapshot.masterResource.durationMs }} ms
        </p>
      </div>

      <div v-if="snapshot.mobileTransferEstimates.length > 0" class="audio-debug-hud__section">
        <p class="audio-debug-hud__section-title">Mobile estimate</p>
        <ul class="audio-debug-hud__estimates">
          <li v-for="estimate in snapshot.mobileTransferEstimates" :key="estimate.label">
            <span>{{ estimate.label }}</span>
            <strong>{{ estimate.seconds }} s</strong>
          </li>
        </ul>
      </div>

      <div v-if="topAssets.length > 0" class="audio-debug-hud__section">
        <p class="audio-debug-hud__section-title">Hot assets</p>
        <ul class="audio-debug-hud__assets">
          <li v-for="asset in topAssets" :key="asset.assetPath">
            <span class="audio-debug-hud__asset-path">{{ asset.assetPath.split('/').at(-1) }}</span>
            <span
              >{{ formatBytes(asset.transferredBytes) }} /
              {{ formatBytes(asset.decodedBytes) }}</span
            >
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.audio-debug-hud {
  position: fixed;
  right: 1rem;
  bottom: clamp(5.5rem, 11vh, 7.5rem);
  z-index: 10001;
  width: min(22rem, calc(100vw - 2rem));
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  background:
    linear-gradient(180deg, rgba(21, 21, 23, 0.94), rgba(12, 12, 14, 0.9)), rgba(0, 0, 0, 0.82);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.32);
  color: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  font-family: Consolas, 'Courier New', monospace;
}

.audio-debug-hud__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.audio-debug-hud__header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.audio-debug-hud__eyebrow,
.audio-debug-hud__section-title,
.audio-debug-hud__metrics dt {
  margin: 0;
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.audio-debug-hud__title {
  margin: 0.2rem 0 0;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.25;
}

.audio-debug-hud__status {
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.7rem;
  white-space: nowrap;
}

.audio-debug-hud__status[data-loading='true'] {
  background: rgba(255, 255, 255, 0.16);
}

.audio-debug-hud__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.72rem;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  transition:
    background 140ms ease,
    border-color 140ms ease,
    color 140ms ease,
    transform 140ms ease;
}

.audio-debug-hud__toggle:hover,
.audio-debug-hud__toggle:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.audio-debug-hud__toggle-glyph {
  display: inline-block;
  font-size: 0.84rem;
  line-height: 1;
  transform: rotate(180deg);
  transition: transform 180ms ease;
}

.audio-debug-hud__toggle-glyph[data-collapsed='true'] {
  transform: rotate(0deg);
}

.audio-debug-hud__body {
  margin-top: 0.2rem;
}

.audio-debug-hud__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem 0.9rem;
  margin: 0.9rem 0 0;
}

.audio-debug-hud__metrics dd {
  margin: 0.18rem 0 0;
  font-size: 0.84rem;
}

.audio-debug-hud__connection,
.audio-debug-hud__section-copy {
  margin: 0.75rem 0 0;
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.72);
}

.audio-debug-hud__section {
  margin-top: 0.8rem;
}

.audio-debug-hud__estimates,
.audio-debug-hud__assets {
  display: grid;
  gap: 0.42rem;
  margin: 0.48rem 0 0;
  padding: 0;
  list-style: none;
}

.audio-debug-hud__estimates li,
.audio-debug-hud__assets li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  font-size: 0.72rem;
}

.audio-debug-hud__asset-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .audio-debug-hud {
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
    bottom: 5.25rem;
  }
}
</style>
