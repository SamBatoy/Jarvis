import { useEffect, useRef, useState } from 'react'

// A basic on/off ambient loop for Focus Mode — generated at runtime via the
// Web Audio API (lowpass-filtered noise), not a bundled audio asset or a
// full audio library. "Simple loop/toggle" per spec, nothing more.
export function useAmbientNoise() {
  const [on, setOn] = useState(false)
  const ctxRef = useRef(null)
  const sourceRef = useRef(null)

  function start() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContextClass()
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400

    const gain = ctx.createGain()
    gain.gain.value = 0.12

    noise.connect(filter).connect(gain).connect(ctx.destination)
    noise.start()

    ctxRef.current = ctx
    sourceRef.current = noise
  }

  function stop() {
    sourceRef.current?.stop()
    ctxRef.current?.close()
    ctxRef.current = null
    sourceRef.current = null
  }

  function toggle() {
    if (on) {
      stop()
      setOn(false)
    } else {
      start()
      setOn(true)
    }
  }

  useEffect(() => () => stop(), [])

  return { on, toggle }
}
