// Text-to-speech and speech recognition from the browser. Chrome and Edge support both;
// other browsers may only speak, in which case speaking questions are swapped for typing.
import { editDistance, norm } from './srs.js'

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export const caps = {
  tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
  mic: !!Recognition,
}

let voice = null
function pickVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en'))
  const prefer = [/google us english/i, /natural/i, /aria|jenny|guy/i, /samantha/i, /en-us/i]
  for (const re of prefer) {
    const v = voices.find((x) => re.test(x.name) || re.test(x.lang))
    if (v) return v
  }
  return voices[0] ?? null
}
if (caps.tts) {
  voice = pickVoice()
  window.speechSynthesis.onvoiceschanged = () => {
    voice = pickVoice()
  }
}

export function speak(text, { slow = false } = {}) {
  if (!caps.tts) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  if (voice) u.voice = voice
  u.rate = slow ? 0.65 : 0.95
  window.speechSynthesis.speak(u)
}

// Reads several lines one after another. Returns a function that stops reading.
export function speakLines(lines, { onLine, onEnd } = {}) {
  if (!caps.tts) return () => {}
  let stopped = false
  window.speechSynthesis.cancel()
  const say = (i) => {
    if (stopped) return
    if (i >= lines.length) return onEnd?.()
    onLine?.(i)
    const u = new SpeechSynthesisUtterance(lines[i])
    u.lang = 'en-US'
    if (voice) u.voice = voice
    u.rate = 0.9
    u.onend = () => say(i + 1)
    u.onerror = () => say(i + 1)
    window.speechSynthesis.speak(u)
  }
  say(0)
  return () => {
    stopped = true
    window.speechSynthesis.cancel()
    onEnd?.()
  }
}

// Speaks one line and calls onEnd when it has been read out.
export function speakThen(text, onEnd) {
  if (!caps.tts) return onEnd?.()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  if (voice) u.voice = voice
  u.rate = 0.95
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  window.speechSynthesis.speak(u)
}

// Listens once and resolves with the possible transcripts, best guess first.
export function listen({ onStart } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error('unsupported'))
    const rec = new Recognition()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 5
    let done = false
    rec.onstart = () => onStart?.()
    rec.onresult = (e) => {
      done = true
      const alts = Array.from(e.results[0]).map((r) => r.transcript)
      resolve(alts)
    }
    rec.onerror = (e) => {
      done = true
      reject(new Error(e.error || 'error'))
    }
    rec.onend = () => {
      if (!done) resolve([])
    }
    rec.start()
  })
}

export const MIC_ERRORS = {
  'not-allowed': 'Microphone access is blocked. Allow it from the lock icon next to the address bar.',
  'service-not-allowed': 'Microphone access is blocked. Allow it from the lock icon next to the address bar.',
  'no-speech': "I didn't hear anything. Tap the mic and try again.",
  'audio-capture': 'No microphone was found on this device.',
  network: 'Speech recognition needs an internet connection.',
  unsupported: 'This browser cannot listen. Try Chrome or Edge.',
}

// Single words or short phrases: right if any transcript contains it, or sounds very close.
export function matchWord(alternatives, target) {
  const t = norm(target).replace(/-/g, ' ')
  let best = alternatives[0] ?? ''
  for (const alt of alternatives) {
    const a = norm(alt).replace(/-/g, ' ')
    if (` ${a} `.includes(` ${t} `)) return { correct: true, heard: alt }
    const closeEnough = t.length >= 4 && editDistance(a, t) <= Math.max(1, Math.floor(t.length / 5))
    if (closeEnough) return { correct: true, heard: alt }
  }
  return { correct: false, heard: best }
}

// Sentences: marks which target words were heard, in order, and scores the share heard.
export function matchSentence(alternatives, sentence) {
  const target = sentence.split(/\s+/)
  const targetNorm = target.map((w) => norm(w).replace(/'/g, ''))
  let best = { score: 0, hits: target.map(() => false), heard: alternatives[0] ?? '' }
  for (const alt of alternatives) {
    const heard = norm(alt).replace(/'/g, '').split(' ').filter(Boolean)
    const hits = lcsHits(targetNorm, heard)
    const counted = targetNorm.filter((w) => w).length || 1
    const score = Math.round((hits.filter((h, i) => h && targetNorm[i]).length / counted) * 100)
    if (score > best.score) best = { score, hits, heard: alt }
  }
  return best
}

function lcsHits(target, heard) {
  const n = target.length
  const m = heard.length
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = target[i] && target[i] === heard[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const hits = Array(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (target[i] && target[i] === heard[j]) {
      hits[i] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return hits
}
