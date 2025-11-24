<template>
    <canvas ref="canvasRef" class="mouse-particles" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let w = 0
let h = 0
let dpr = 1
let rafId = 0

type Particle = { x: number; y: number; vx: number; vy: number; life: number; r: number }
const particles: Particle[] = []
const MAX_PARTICLES = 80

let mouseX = -1000
let mouseY = -1000

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

function addParticle(x: number, y: number) {
    if (particles.length >= MAX_PARTICLES) {
        particles.shift()
    }
    const angle = Math.random() * Math.PI * 2
    const speed = 0.3 + Math.random() * 0.6
    particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 60 + Math.random() * 60,
        r: 0.4 + Math.random() * 0.9
    })
}

function onMove(e: MouseEvent) {
    const el = canvasRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top
    // add a small burst of very subtle particles
    addParticle(mouseX, mouseY)
    if (Math.random() > 0.6) addParticle(mouseX + (Math.random() - 0.5) * 6, mouseY + (Math.random() - 0.5) * 6)
}

function draw() {
    if (!ctx || !canvasRef.value) return
    // subtle darkened clear to create a thin trailing effect
    ctx.clearRect(0, 0, w, h)

    // drawing style: thin glowing red lines, very low opacity
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        // simple physics
        p.vx *= 0.98
        p.vy *= 0.98
        // gentle attraction to mouse for a following feeling
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        p.vx += dx * 0.0008
        p.vy += dy * 0.0008
        p.x += p.vx
        p.y += p.vy
        p.life -= 1
    }

    // draw connecting lines and tiny points
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const alpha = Math.max(0, Math.min(1, p.life / 80)) * 0.9

        // connect to previous particle for a thin strand
        if (i > 0) {
            const p2 = particles[i - 1]
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
            if (dist < 100) {
                ctx.beginPath()
                ctx.moveTo(p.x, p.y)
                ctx.lineTo(p2.x, p2.y)
                ctx.strokeStyle = `rgba(220,40,40,${(alpha * 0.06).toFixed(3)})`
                ctx.lineWidth = 0.9
                // slight glow
                ctx.shadowBlur = 6
                ctx.shadowColor = `rgba(200,40,40,${(alpha * 0.06).toFixed(3)})`
                ctx.stroke()
                ctx.shadowBlur = 0
            }
        }

        // small dot for each particle
        ctx.beginPath()
        ctx.fillStyle = `rgba(255,60,60,${(alpha * 0.12).toFixed(3)})`
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
    }

    // remove dead
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
    }

    rafId = requestAnimationFrame(draw)
}

onMounted(() => {
    const el = canvasRef.value
    if (!el) return
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    // fill the canvas with a few initial stationary faint particles
    for (let i = 0; i < 6; i++) {
        addParticle((el.clientWidth / 2) + (Math.random() - 0.5) * el.clientWidth * 0.5, (el.clientHeight / 2) + (Math.random() - 0.5) * el.clientHeight * 0.5)
    }
    rafId = requestAnimationFrame(draw)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMove)
    cancelAnimationFrame(rafId)
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
