// Small synthesized sound effects, so the game needs no audio files.
let ctx = null
let enabled = true

export function setSoundEnabled(on) {
  enabled = on
}

function tone(freq, start, duration, { type = 'sine', gain = 0.18 } = {}) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
  g.gain.setValueAtTime(0, ctx.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
  osc.connect(g).connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + duration + 0.05)
}

const SOUNDS = {
  correct: () => {
    tone(660, 0, 0.12, { type: 'triangle' })
    tone(990, 0.09, 0.2, { type: 'triangle' })
  },
  wrong: () => {
    tone(220, 0, 0.18, { type: 'sawtooth', gain: 0.08 })
    tone(170, 0.12, 0.25, { type: 'sawtooth', gain: 0.08 })
  },
  tap: () => tone(520, 0, 0.06, { type: 'sine', gain: 0.08 }),
  discover: () => {
    tone(523, 0, 0.12, { type: 'sine' })
    tone(784, 0.08, 0.18, { type: 'sine' })
  },
  fanfare: () => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, { type: 'triangle', gain: 0.16 }))
  },
  unlock: () => {
    ;[392, 523, 659].forEach((f, i) => tone(f, i * 0.08, 0.22, { type: 'square', gain: 0.06 }))
  },
}

export function play(name) {
  if (!enabled) return
  try {
    ctx = ctx ?? new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    SOUNDS[name]?.()
  } catch {
    // No audio on this device; the game works silently.
  }
}
