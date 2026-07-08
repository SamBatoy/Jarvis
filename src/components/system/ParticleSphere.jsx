import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PARTICLE_COUNT = 4000
const SPHERE_RADIUS = 2.2
const HUD_ACCENT = 0x38e1ff
const BASE_ROTATION_SPEED = 0.05 // radians/sec

// Evenly distributes points on a sphere via the golden-angle spiral —
// a naive lat/long grid clusters points at the poles, this doesn't.
function fibonacciSpherePositions(count, radius) {
  const positions = new Float32Array(count * 3)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radiusAtY = Math.sqrt(Math.max(1 - y * y, 0))
    const theta = goldenAngle * i
    positions[i * 3] = Math.cos(theta) * radiusAtY * radius
    positions[i * 3 + 1] = y * radius
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius
  }
  return positions
}

// completionRate: 0-1, or null if there's no archived history yet — treated
// as a neutral mid-level glow rather than 0%, since "no data" isn't "failing."
export default function ParticleSphere({ completionRate }) {
  const canvasRef = useRef(null)
  const completionRateRef = useRef(completionRate)
  completionRateRef.current = completionRate

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.z = 6.5

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const positions = fibonacciSpherePositions(PARTICLE_COUNT, SPHERE_RADIUS)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: HUD_ACCENT,
      size: 0.032,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const sphere = new THREE.Points(geometry, material)
    scene.add(sphere)

    // Thin concentric rings, each tilted slightly differently so they read
    // as a HUD instrument rather than a flat halo.
    const ringGroup = new THREE.Group()
    const ringRadii = [3.0, 3.55, 4.2]
    ringRadii.forEach((radius, i) => {
      const ringGeometry = new THREE.RingGeometry(radius, radius + 0.012, 128)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: HUD_ACCENT,
        transparent: true,
        opacity: 0.16 - i * 0.03,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.2
      ring.rotation.y = i * 0.4
      ringGroup.add(ring)
    })
    scene.add(ringGroup)

    function resize() {
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0 || clientHeight === 0) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    let frameId = null
    let lastTime = performance.now()
    const clock = { elapsed: 0 }

    function renderStaticFrame() {
      renderer.render(scene, camera)
    }

    function tick(now) {
      frameId = requestAnimationFrame(tick)
      const delta = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      clock.elapsed += delta

      // Neutral 0.5 when there's no completion data yet, rather than
      // treating "unknown" the same as "0% — struggling."
      const rate = completionRateRef.current ?? 0.5
      const speedMultiplier = 0.7 + rate * 0.7 // 0.7x-1.4x — noticeable, not jarring
      sphere.rotation.y += delta * BASE_ROTATION_SPEED * speedMultiplier
      ringGroup.rotation.y -= delta * BASE_ROTATION_SPEED * 0.4

      // Gentle pulse layered on top of the completion-driven baseline
      // brightness, so it reads as "alive" rather than a static gauge.
      const pulse = Math.sin(clock.elapsed * 0.9) * 0.06
      material.opacity = 0.55 + rate * 0.35 + pulse
      material.size = 0.028 + rate * 0.012

      renderer.render(scene, camera)
    }

    let visibilityPaused = false
    function handleVisibilityChange() {
      if (document.hidden) {
        visibilityPaused = true
        if (frameId !== null) cancelAnimationFrame(frameId)
        frameId = null
      } else if (visibilityPaused) {
        visibilityPaused = false
        lastTime = performance.now()
        if (!reducedMotionQuery.matches) frameId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (reducedMotionQuery.matches) {
      // Static composition: one render, no rAF loop at all.
      renderStaticFrame()
    } else {
      frameId = requestAnimationFrame(tick)
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      resizeObserver.disconnect()
      if (frameId !== null) cancelAnimationFrame(frameId)
      geometry.dispose()
      material.dispose()
      ringGroup.children.forEach((ring) => {
        ring.geometry.dispose()
        ring.material.dispose()
      })
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
}
