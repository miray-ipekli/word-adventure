// Spaced repetition. Each word climbs through boxes 1-6; every box asks a harder kind of
// question, and a word only counts as mastered after passing all of them on different days.
// A wrong answer drops the word two boxes and marks it as tricky, so it comes back sooner.
import { ALL_ITEMS, CUSTOM_TOPIC, LEVELS } from '../data/topics.js'

const MIN = 60 * 1000
const DAY = 24 * 60 * MIN

// How long to wait before showing a word again once it reaches a box.
export const WAIT_AFTER = { 1: 0, 2: 10 * MIN, 3: DAY, 4: 2 * DAY, 5: 4 * DAY, 6: 10 * DAY }
const MASTERED_REVIEW = 30 * DAY
export const MASTERED_BOX = 6
// A word or phrase at box 5 has been recalled correctly on three different days.
export const STRONG_BOX = 5

export const QUESTION_LABEL = {
  meaning: 'What does it mean?',
  reverse: 'Find the English word',
  listen: 'Listen and choose',
  gap: 'Fill the gap',
  build: 'Build the word',
  type: 'Type it in English',
  speak: 'Say it out loud',
  order: 'Put the words in order',
}

export function wordsFor(profile) {
  const custom = profile.custom.map((w) => ({ ...w, kind: 'word', topic: CUSTOM_TOPIC.id, level: profile.level }))
  return [...ALL_ITEMS, ...custom]
}

export function wordIndex(profile) {
  return new Map(wordsFor(profile).map((w) => [w.id, w]))
}

// Words and phrases the player should be learning right now: their topics at their level,
// plus their own words.
export function activeWords(profile, topicId) {
  return wordsFor(profile).filter((w) => {
    if (topicId) return w.topic === topicId && (w.topic === CUSTOM_TOPIC.id || w.level === profile.level)
    if (w.topic === CUSTOM_TOPIC.id) return true
    return profile.topics.includes(w.topic) && w.level === profile.level
  })
}

export function isTricky(card) {
  return !!card && card.box < MASTERED_BOX && (card.focus || card.lapses >= 2)
}

export function statusOf(card) {
  if (!card) return 'new'
  if (card.box >= MASTERED_BOX) return 'mastered'
  if (isTricky(card)) return 'tricky'
  return 'learning'
}

export function isDue(card, now = Date.now()) {
  return !!card && card.due <= now
}

export function topicStats(profile, topicId) {
  const words = activeWords(profile, topicId)
  const stats = { total: words.length, new: 0, learning: 0, tricky: 0, mastered: 0, started: 0, strong: 0, due: 0, progress: 0 }
  // strong: recalled on three different days (box 5+), the bar for conquering an island
  const now = Date.now()
  let boxes = 0
  for (const w of words) {
    const card = profile.cards[w.id]
    stats[statusOf(card)] += 1
    if (card) stats.started += 1
    if (card && card.box >= STRONG_BOX) stats.strong += 1
    if (isDue(card, now)) stats.due += 1
    boxes += Math.min(card?.box ?? 0, MASTERED_BOX)
  }
  stats.progress = words.length ? boxes / (words.length * MASTERED_BOX) : 0
  return stats
}

export function dueCount(profile) {
  const now = Date.now()
  const index = wordIndex(profile)
  return Object.entries(profile.cards).filter(([id, c]) => index.has(id) && isDue(c, now)).length
}

export function trickyWords(profile) {
  const index = wordIndex(profile)
  return Object.entries(profile.cards)
    .filter(([id, c]) => index.has(id) && isTricky(c))
    .map(([id]) => index.get(id))
}

export function questionTypeFor(card, profile, caps, word) {
  const box = card?.box ?? 1
  const canListen = caps.tts
  const canSpeak = caps.mic && profile.micOn !== false
  // Beginners build words from letter tiles and phrases from word tiles instead of typing.
  const build = profile.level !== 'beginner' ? 'type' : word?.kind === 'phrase' ? 'order' : 'build'
  switch (box) {
    case 1:
      return 'meaning'
    case 2:
      return canListen ? 'listen' : 'reverse'
    case 3:
      return 'gap'
    case 4:
      return build
    case 5:
      return canSpeak ? 'speak' : build
    default: {
      const mix = ['reverse', 'gap', build]
      if (canSpeak) mix.push('speak')
      return mix[Math.floor(Math.random() * mix.length)]
    }
  }
}

export function applyAnswer(card, correct, now = Date.now()) {
  const base = card ?? { box: 1, due: now, lapses: 0, right: 0, wrong: 0, focus: false }
  if (correct) {
    if (base.box >= MASTERED_BOX) return { ...base, right: base.right + 1, due: now + MASTERED_REVIEW, at: now }
    const box = base.box + 1
    return {
      ...base,
      box,
      right: base.right + 1,
      due: now + WAIT_AFTER[box],
      at: now,
      // A tricky word stops being tricky once it climbs back to the harder questions.
      focus: box >= 4 ? false : base.focus,
    }
  }
  return {
    ...base,
    box: Math.max(1, base.box - 2),
    lapses: base.lapses + 1,
    wrong: base.wrong + 1,
    due: now,
    focus: true,
    at: now,
  }
}

export function discoverCard(alreadyKnown, now = Date.now()) {
  // "I know this" still gets checked: it jumps ahead but is tested again tomorrow.
  if (alreadyKnown) return { box: 3, due: now + DAY, lapses: 0, right: 0, wrong: 0, focus: false, at: now }
  return { box: 1, due: now, lapses: 0, right: 0, wrong: 0, focus: false, at: now }
}

export function focusCard(card, now = Date.now()) {
  const base = card ?? { box: 1, lapses: 0, right: 0, wrong: 0 }
  return { ...base, box: Math.min(base.box, 3), due: now, focus: true, at: now }
}

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Builds the list of steps for one play session.
// mode: 'island' (one topic), 'review' (everything due), 'tricky' (boss words only)
// allowPhrases: an island only introduces its phrases once the Phrase Cave is open.
export function buildSession(profile, { mode, topicId, caps, allowPhrases = true, size = 10 }) {
  const now = Date.now()
  const index = wordIndex(profile)
  const started = Object.entries(profile.cards)
    .filter(([id]) => index.has(id))
    .map(([id, card]) => ({ word: index.get(id), card }))

  let reviews
  if (mode === 'tricky') {
    reviews = started.filter(({ card }) => isTricky(card))
  } else {
    reviews = started.filter(({ word, card }) => isDue(card, now) && (!topicId || word.topic === topicId))
  }
  // Tricky words first, then the ones that have waited longest.
  reviews.sort((a, b) => Number(isTricky(b.card)) - Number(isTricky(a.card)) || a.card.due - b.card.due)

  // Islands mix reviews with a few new words; review and tricky runs only revisit known words.
  const unseen =
    mode === 'island'
      ? activeWords(profile, topicId).filter((w) => !profile.cards[w.id] && (allowPhrases || w.kind !== 'phrase'))
      : []
  const maxNew = profile.level === 'beginner' ? 3 : 4
  const freshCount = Math.min(maxNew, unseen.length, Math.max(1, Math.floor((size - reviews.length) / 2)))
  const fresh = unseen.slice(0, freshCount)
  const chosenReviews = reviews.slice(0, Math.max(0, size - fresh.length * 2))

  const reviewSteps = shuffle(
    chosenReviews.map(({ word, card }) => ({ kind: 'quiz', wordId: word.id, type: questionTypeFor(card, profile, caps, word) })),
  )

  // New words are quizzed one step after the next word is introduced, so the answer
  // is not still on screen: D1 D2 Q1 D3 Q2 Q3.
  const newSteps = []
  fresh.forEach((word, i) => {
    newSteps.push({ kind: 'discover', wordId: word.id })
    if (i > 0) newSteps.push({ kind: 'quiz', wordId: fresh[i - 1].id, type: 'meaning' })
  })
  if (fresh.length) newSteps.push({ kind: 'quiz', wordId: fresh.at(-1).id, type: 'meaning' })

  // Spread reviews between the new-word steps.
  const mixed = []
  const gap = newSteps.length ? Math.max(1, Math.ceil(reviewSteps.length / newSteps.length)) : reviewSteps.length
  let r = 0
  for (const s of newSteps) {
    mixed.push(s)
    for (let k = 0; k < gap && r < reviewSteps.length; k++) mixed.push(reviewSteps[r++])
  }
  while (r < reviewSteps.length) mixed.push(reviewSteps[r++])

  // Nothing due and nothing new: offer extra practice. Practice answers earn XP but do not
  // move words forward, so the spacing between real reviews stays intact.
  if (!mixed.length && mode === 'island') {
    const known = shuffle(started.filter(({ word }) => word.topic === topicId)).slice(0, 8)
    return known.map(({ word, card }) => ({
      kind: 'quiz',
      wordId: word.id,
      type: questionTypeFor(card, profile, caps, word),
      practice: true,
    }))
  }
  return mixed
}

export function nextDueAt(profile) {
  const index = wordIndex(profile)
  const times = Object.entries(profile.cards)
    .filter(([id]) => index.has(id))
    .map(([, c]) => c.due)
  return times.length ? Math.min(...times) : null
}

// Picks three wrong options, preferring words from the same level and topic.
export function distractors(word, profile, field, count = 3) {
  const pool = wordsFor(profile).filter((w) => w.id !== word.id && w[field] !== word[field])
  const ranked = shuffle(pool).sort((a, b) => score(b) - score(a))
  function score(w) {
    return (w.kind === word.kind ? 4 : 0) + (w.level === word.level ? 2 : 0) + (w.topic === word.topic ? 1 : 0)
  }
  const picked = []
  const seen = new Set([norm(word[field])])
  for (const w of ranked) {
    const key = norm(w[field])
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(w)
    if (picked.length === count) break
  }
  return picked
}

export function norm(s) {
  return s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9ğüşöçıâîû' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return dp[a.length][b.length]
}

// Typed answers: exact is right, one small slip in a longer word still counts.
export function checkTyped(input, target) {
  const a = norm(input).replace(/-/g, ' ')
  const b = norm(target).replace(/-/g, ' ')
  if (a === b) return { correct: true, exact: true }
  if (b.length >= 5 && editDistance(a, b) === 1) return { correct: true, exact: false }
  return { correct: false, exact: false }
}

export function gapSentence(word) {
  const escaped = word.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'i')
  return re.test(word.ex) ? word.ex.replace(re, '_____') : null
}

export function levelName(id) {
  return LEVELS.find((l) => l.id === id)?.name ?? id
}

export function nextLevel(id) {
  const i = LEVELS.findIndex((l) => l.id === id)
  return LEVELS[i + 1] ?? null
}
