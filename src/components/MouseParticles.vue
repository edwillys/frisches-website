<template>
    <canvas ref="canvasRef" class="mouse-particles" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

// ============================================
// TWEAKABLE CONSTANTS
// ============================================
const CONSTANTS = {
    // Particle behavior
    PARTICLE_COUNT: 100,
    PARTICLE_SIZE_MIN: 0.4,
    PARTICLE_SIZE_MAX: 2.0,
    PARTICLE_SPEED_MIN: 0.05,
    PARTICLE_SPEED_MAX: 0.15,

    // Floating behavior (physics-based)
    GRAVITY: 0.01,
    BUOYANCY: 0.015,
    AIR_RESISTANCE: 0.99,
    TURBULENCE: 0.02,

    // Mouse attraction
    MOUSE_ATTRACTION_STRENGTH: 0.002,
    MOUSE_ATTRACTION_RADIUS: 180,
    DISPERSION_RATE: 0.96,

    // Logo button attraction
    LOGO_ATTRACTION_PERCENTAGE: 0.3,
    LOGO_ATTRACTION_STRENGTH: 0.003,
    LOGO_ORBIT_RADIUS: 100,
    LOGO_ORBIT_VARIANCE: 20,
    LOGO_TRANSITION_DURATION: 10,

    // Glow effect
    GLOW_FREQUENCY: 0.01,
    GLOW_MIN_ALPHA: 0.1,
    GLOW_MAX_ALPHA: 0.5,
    GLOW_BLUR_MIN: 4,
    GLOW_BLUR_MAX: 12,

    // Shape randomness (0 = very irregular, 1 = perfect circle)
    SHAPE_SEGMENTS: 6,
    SHAPE_IRREGULARITY: 0.35,

    // Colors (RGB) - red theme
    COLOR: { r: 220, g: 40, b: 40 },
    COLOR_VARIANCE: 10
}

// ============================================
// TYPES & STATE
// ============================================
type Particle = {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    glowPhase: number
    shapeOffsets: number[]
    isAttracted: boolean
    attractionTime: number
    isLogoAttracted: boolean
    logoOrbitAngle: number
    logoOrbitRadius: number
    logoTransition: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let w = 0
let h = 0
let dpr = 1
let rafId = 0

const particles: Particle[] = []
let mouseX = -1000
let mouseY = -1000
let mouseMoving = false
let mouseMoveTimeout: number | null = null

// Logo button state
let logoButtonVisible = false
let logoButtonHovered = false
let logoButtonX = 0
let logoButtonY = 0

// ============================================
// CANVAS SETUP
// ============================================
function resize() {
    const el = canvasRef.value
    if (!el) return

    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = el.clientWidth
    h = el.clientHeight
    el.width = Math.max(1, Math.floor(w * dpr))
    el.height = Math.max(1, Math.floor(h * dpr))

    ctx = el.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
}

// ============================================
// PARTICLE CREATION
// ============================================
function createParticle(): Particle {
    const angle = Math.random() * Math.PI * 2
    const speed = CONSTANTS.PARTICLE_SPEED_MIN +
        Math.random() * (CONSTANTS.PARTICLE_SPEED_MAX - CONSTANTS.PARTICLE_SPEED_MIN)

    // Create random shape offsets for irregular edges
    const shapeOffsets: number[] = []
    for (let i = 0; i < CONSTANTS.SHAPE_SEGMENTS; i++) {
        shapeOffsets.push(
            1 - CONSTANTS.SHAPE_IRREGULARITY +
            Math.random() * CONSTANTS.SHAPE_IRREGULARITY * 2
        )
    }

    return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: CONSTANTS.PARTICLE_SIZE_MIN +
            Math.random() * (CONSTANTS.PARTICLE_SIZE_MAX - CONSTANTS.PARTICLE_SIZE_MIN),
        glowPhase: Math.random() * Math.PI * 2,
        shapeOffsets,
        isAttracted: false,
        attractionTime: 0,
        isLogoAttracted: false,
        logoOrbitAngle: Math.random() * Math.PI * 2,
        logoOrbitRadius: CONSTANTS.LOGO_ORBIT_RADIUS + (Math.random() - 0.5) * CONSTANTS.LOGO_ORBIT_VARIANCE,
        logoTransition: 0
    }
}

function initializeParticles() {
    particles.length = 0
    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
        particles.push(createParticle())
    }
}

// ============================================
// MOUSE TRACKING
// ============================================
function onMove(e: MouseEvent) {
    const el = canvasRef.value
    if (!el) return

    const rect = el.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top
    mouseMoving = true

    // Reset mouse movement timeout
    if (mouseMoveTimeout !== null) {
        clearTimeout(mouseMoveTimeout)
    }
    mouseMoveTimeout = window.setTimeout(() => {
        mouseMoving = false
    }, 100)
}

// ============================================
// ANIMATION LOOP
// ============================================
function updateParticles() {
    // Select particles for logo attraction if button is visible and hovered
    if (logoButtonVisible && logoButtonHovered) {
        const nonLogoAttracted = particles.filter(p => !p.isLogoAttracted)
        const targetCount = Math.floor(particles.length * CONSTANTS.LOGO_ATTRACTION_PERCENTAGE)
        const currentCount = particles.filter(p => p.isLogoAttracted).length

        if (currentCount < targetCount) {
            // Sort by distance to logo and attract closest ones
            nonLogoAttracted.sort((a, b) => {
                const distA = Math.hypot(a.x - logoButtonX, a.y - logoButtonY)
                const distB = Math.hypot(b.x - logoButtonX, b.y - logoButtonY)
                return distA - distB
            })

            const toAttract = targetCount - currentCount
            for (let i = 0; i < Math.min(toAttract, nonLogoAttracted.length); i++) {
                const particle = nonLogoAttracted[i]
                if (particle) {
                    particle.isLogoAttracted = true
                    particle.logoTransition = 0
                }
            }
        }
    } else {
        // Release all logo-attracted particles
        particles.forEach(p => {
            if (p.isLogoAttracted) {
                p.isLogoAttracted = false
                p.logoTransition = 0
            }
        })
    }

    for (const p of particles) {
        if (p.isLogoAttracted) {
            // Transition to orbit
            if (p.logoTransition < CONSTANTS.LOGO_TRANSITION_DURATION) {
                p.logoTransition++
            }

            const t = Math.min(1, p.logoTransition / CONSTANTS.LOGO_TRANSITION_DURATION)
            const easedT = t * t * (3 - 2 * t) // smoothstep easing

            // Calculate target orbit position
            p.logoOrbitAngle += 0.005 + Math.random() * 0.003
            const targetX = logoButtonX + Math.cos(p.logoOrbitAngle) * p.logoOrbitRadius
            const targetY = logoButtonY + Math.sin(p.logoOrbitAngle) * p.logoOrbitRadius

            // Interpolate to orbit position
            const dx = targetX - p.x
            const dy = targetY - p.y
            p.vx = dx * CONSTANTS.LOGO_ATTRACTION_STRENGTH * easedT
            p.vy = dy * CONSTANTS.LOGO_ATTRACTION_STRENGTH * easedT

            p.x += p.vx
            p.y += p.vy
        } else if (p.logoTransition > 0) {
            // Transitioning away from logo orbit
            p.logoTransition = Math.max(0, p.logoTransition - 2)

            // Apply dispersion
            p.vx *= CONSTANTS.DISPERSION_RATE
            p.vy *= CONSTANTS.DISPERSION_RATE

            // Resume normal physics
            p.vy += CONSTANTS.GRAVITY
            p.vy -= CONSTANTS.BUOYANCY
            p.vx *= CONSTANTS.AIR_RESISTANCE
            p.vy *= CONSTANTS.AIR_RESISTANCE
            p.vx += (Math.random() - 0.5) * CONSTANTS.TURBULENCE
            p.vy += (Math.random() - 0.5) * CONSTANTS.TURBULENCE

            p.x += p.vx
            p.y += p.vy
        } else {
            // Normal floating behavior
            // Physics-based floating
            // Gravity pulls down
            p.vy += CONSTANTS.GRAVITY

            // Buoyancy pushes up (like dust floating in air)
            p.vy -= CONSTANTS.BUOYANCY

            // Air resistance
            p.vx *= CONSTANTS.AIR_RESISTANCE
            p.vy *= CONSTANTS.AIR_RESISTANCE

            // Subtle turbulence (air currents)
            p.vx += (Math.random() - 0.5) * CONSTANTS.TURBULENCE
            p.vy += (Math.random() - 0.5) * CONSTANTS.TURBULENCE

            // Mouse attraction when cursor is moving
            const dx = mouseX - p.x
            const dy = mouseY - p.y
            const dist = Math.hypot(dx, dy)

            if (mouseMoving && dist < CONSTANTS.MOUSE_ATTRACTION_RADIUS) {
                const force = (1 - dist / CONSTANTS.MOUSE_ATTRACTION_RADIUS) *
                    CONSTANTS.MOUSE_ATTRACTION_STRENGTH
                p.vx += dx * force
                p.vy += dy * force
                p.isAttracted = true
                p.attractionTime = 60
            }

            // Disperse attracted particles when mouse stops
            if (p.isAttracted && !mouseMoving && p.attractionTime > 0) {
                p.attractionTime--
                p.vx *= CONSTANTS.DISPERSION_RATE
                p.vy *= CONSTANTS.DISPERSION_RATE
                if (p.attractionTime <= 0) {
                    p.isAttracted = false
                }
            }

            // Update position
            p.x += p.vx
            p.y += p.vy
        }

        // Wrap around edges
        if (p.x < -50) p.x = w + 50
        if (p.x > w + 50) p.x = -50
        if (p.y < -50) p.y = h + 50
        if (p.y > h + 50) p.y = -50

        // Update glow phase
        p.glowPhase += CONSTANTS.GLOW_FREQUENCY
    }
}

function drawParticles() {
    if (!ctx) return

    for (const p of particles) {
        // Calculate pulsing glow
        const glowIntensity = 0.5 + 0.5 * Math.sin(p.glowPhase)
        const alpha = CONSTANTS.GLOW_MIN_ALPHA +
            glowIntensity * (CONSTANTS.GLOW_MAX_ALPHA - CONSTANTS.GLOW_MIN_ALPHA)
        const blur = CONSTANTS.GLOW_BLUR_MIN +
            glowIntensity * (CONSTANTS.GLOW_BLUR_MAX - CONSTANTS.GLOW_BLUR_MIN)

        // Color variation
        const r = CONSTANTS.COLOR.r + (Math.random() - 0.5) * CONSTANTS.COLOR_VARIANCE
        const g = CONSTANTS.COLOR.g + (Math.random() - 0.5) * CONSTANTS.COLOR_VARIANCE
        const b = CONSTANTS.COLOR.b + (Math.random() - 0.5) * CONSTANTS.COLOR_VARIANCE

        // Draw particle with irregular shape
        ctx.save()
        ctx.translate(p.x, p.y)

        ctx.beginPath()
        for (let i = 0; i <= p.shapeOffsets.length; i++) {
            const angle = (i / p.shapeOffsets.length) * Math.PI * 2
            const offset = p.shapeOffsets[i % p.shapeOffsets.length] || 1
            const x = Math.cos(angle) * p.size * offset
            const y = Math.sin(angle) * p.size * offset

            if (i === 0) {
                ctx.moveTo(x, y)
            } else {
                ctx.lineTo(x, y)
            }
        }
        ctx.closePath()

        // Glow effect
        ctx.shadowBlur = blur
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.fill()

        ctx.restore()
    }
}

function draw() {
    if (!ctx || !canvasRef.value) return

    // Clear canvas
    ctx.clearRect(0, 0, w, h)

    // Update and draw
    updateParticles()
    drawParticles()

    rafId = requestAnimationFrame(draw)
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
    const el = canvasRef.value
    if (!el) return

    resize()
    initializeParticles()

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)

    rafId = requestAnimationFrame(draw)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMove)
    cancelAnimationFrame(rafId)
})

// ============================================
// PUBLIC API
// ============================================
function setLogoButtonState(hovered: boolean, x: number, y: number) {
    logoButtonVisible = true
    logoButtonHovered = hovered
    logoButtonX = x
    logoButtonY = y

    // If button just became visible, no need to do anything special
    // Particles will be attracted based on hover state
}

function hideLogoButton() {
    logoButtonVisible = false
    logoButtonHovered = false
    // Particles will naturally disperse in the next update cycle
}

defineExpose({
    setLogoButtonState,
    hideLogoButton
})
</script>

<style scoped>
.mouse-particles {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    /* High z-index so the subtle effect overlays the CardDealer area */
    z-index: 9999;
    pointer-events: none;
    mix-blend-mode: screen;
}
</style>
