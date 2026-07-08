import { useEffect, useRef } from 'react'

const HUD_ACCENT = 'rgba(56, 225, 255, 0.9)'
const RING_COLOR = 'rgba(56, 225, 255, 0.18)'

// blips: [{ id, title, proximity (0=now, 1=at horizon), color, contextName }]
// Canvas is decorative/redundant here — the real list beneath it (rendered
// as plain text) is what a screen reader or reduced-motion user actually
// gets the information from.
export default function DeadlineRadar({ blips }) {
  const canvasRef = useRef(null)
  const blipsRef = useRef(blips)
  blipsRef.current = blips

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    let size = 0
    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2)
      size = container.clientWidth
      if (size === 0) return
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    let sweepAngle = 0
    let frameId = null

    function draw() {
      if (size === 0) return
      const cx = size / 2
      const cy = size / 2
      const maxRadius = size / 2 - 10

      ctx.clearRect(0, 0, size, size)

      // Concentric rings + crosshair
      ctx.strokeStyle = RING_COLOR
      ctx.lineWidth = 1
      ;[0.33, 0.66, 1].forEach((f) => {
        ctx.beginPath()
        ctx.arc(cx, cy, maxRadius * f, 0, Math.PI * 2)
        ctx.stroke()
      })
      ctx.beginPath()
      ctx.moveTo(cx - maxRadius, cy)
      ctx.lineTo(cx + maxRadius, cy)
      ctx.moveTo(cx, cy - maxRadius)
      ctx.lineTo(cx, cy + maxRadius)
      ctx.stroke()

      // Sweep — createConicGradient isn't universally supported (notably
      // older Safari); skip the sweep rather than throw on those browsers,
      // the rings/blips/crosshair alone still read fine as a radar.
      if (!reducedMotionQuery.matches && typeof ctx.createConicGradient === 'function') {
        const gradient = ctx.createConicGradient(sweepAngle - Math.PI / 2, cx, cy)
        gradient.addColorStop(0, 'rgba(56, 225, 255, 0.22)')
        gradient.addColorStop(0.04, 'rgba(56, 225, 255, 0)')
        gradient.addColorStop(1, 'rgba(56, 225, 255, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Blips, evenly spread by angle (already urgency-sorted), radius by
      // proximity — closer due date reads as closer to center.
      const currentBlips = blipsRef.current
      currentBlips.forEach((blip, i) => {
        const angle = (i / Math.max(currentBlips.length, 1)) * Math.PI * 2
        const radius = blip.proximity * maxRadius
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        const isUrgent = blip.proximity < 0.15
        const blipRadius = isUrgent && !reducedMotionQuery.matches ? 3.5 + Math.sin(sweepAngle * 3) * 1.5 : 3.5

        ctx.beginPath()
        ctx.fillStyle = blip.color
        ctx.shadowColor = blip.color
        ctx.shadowBlur = isUrgent ? 10 : 5
        ctx.arc(x, y, blipRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Origin dot
      ctx.beginPath()
      ctx.fillStyle = HUD_ACCENT
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    function tick() {
      sweepAngle += 0.012
      draw()
      frameId = requestAnimationFrame(tick)
    }

    let visibilityPaused = false
    function handleVisibilityChange() {
      if (document.hidden) {
        visibilityPaused = true
        if (frameId !== null) cancelAnimationFrame(frameId)
        frameId = null
      } else if (visibilityPaused) {
        visibilityPaused = false
        if (!reducedMotionQuery.matches) frameId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (reducedMotionQuery.matches) {
      draw()
    } else {
      frameId = requestAnimationFrame(tick)
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      resizeObserver.disconnect()
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="block" />
}
