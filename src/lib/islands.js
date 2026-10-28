// Island conquest. Each island has four stations that open in order:
//   Word Camp     12 words, open from the start
//   Phrase Cave   6 phrases, opens once 6 words reached box 3 (recalled on two days)
//   Story Tower   a story to read and listen to, opens once every word and phrase was seen
//   Castle        a role-play scene and a final exam, opens once every word and phrase is
//                 strong (box 5) and the story is done
// Passing the exam conquers the island and opens the next one. Islands stay open forever.
import { CUSTOM_TOPIC } from '../data/topics.js'
import { activeWords, isDue, STRONG_BOX, WAIT_AFTER } from './srs.js'
import { todayKey } from './progress.js'

const DAY = 24 * 60 * 60 * 1000
export const CAVE_NEED = 6

export const islandKey = (level, topicId) => `${level}:${topicId}`

export function passMark(level) {
  return level === 'beginner' ? 0.7 : 0.85
}

export function islandRecord(profile, topicId, level = profile.level) {
  return profile.islands?.[islandKey(level, topicId)] ?? {}
}

export function isConquered(profile, topicId) {
  return !!islandRecord(profile, topicId).examPassedAt
}

// Shortest time until every item can reach box 5, if each review is done the moment it is due.
export function castleEta(items, cards, now = Date.now()) {
  let longest = 0
  for (const w of items) {
    const card = cards[w.id]
    const box = card?.box ?? 0
    if (box >= STRONG_BOX) continue
    let ms = card ? Math.max(0, card.due - now) : 0
    for (let k = box + 1; k < STRONG_BOX; k++) ms += WAIT_AFTER[k]
    longest = Math.max(longest, ms)
  }
  return longest
}

export function islandState(profile, topicId, order, now = Date.now()) {
  const items = activeWords(profile, topicId)
  const words = items.filter((w) => w.kind !== 'phrase')
  const phrases = items.filter((w) => w.kind === 'phrase')
  const box = (w) => profile.cards[w.id]?.box ?? 0
  const count = (list, min) => list.filter((w) => box(w) >= min).length
  const rec = islandRecord(profile, topicId)

  const conquered = !!rec.examPassedAt
  const previous = order > 0 ? profile.topics[order - 1] : null
  const grandfathered = order < (profile.openIslands?.[profile.level] ?? 0)
  const unlocked = topicId === CUSTOM_TOPIC.id || order <= 0 || conquered || grandfathered || isConquered(profile, previous)

  const caveOpen = count(words, 3) >= CAVE_NEED || phrases.some((p) => box(p) > 0)
  const towerOpen = items.length > 0 && items.every((w) => box(w) >= 1)
  const storyDone = !!rec.storyAt
  const allStrong = items.length > 0 && items.every((w) => box(w) >= STRONG_BOX)
  const castleOpen = allStrong && storyDone

  return {
    unlocked,
    conquered,
    previous,
    words: { total: words.length, seen: count(words, 1), cave: count(words, 3), strong: count(words, STRONG_BOX) },
    phrases: { total: phrases.length, seen: count(phrases, 1), strong: count(phrases, STRONG_BOX) },
    caveOpen,
    towerOpen,
    storyDone,
    roleplayDone: !!rec.roleplayAt,
    castleOpen,
    examBlocked: !conquered && rec.examFailedOn === todayKey(new Date(now)),
    due: items.filter((w) => isDue(profile.cards[w.id], now)).length,
    fresh: items.filter((w) => !profile.cards[w.id] && (caveOpen || w.kind !== 'phrase')).length,
    etaDays: allStrong ? 0 : Math.ceil(castleEta(items, profile.cards, now) / DAY),
    // 0..1 for the progress bar under the island on the map
    progress: items.length
      ? (items.reduce((sum, w) => sum + Math.min(box(w), STRONG_BOX), 0) / (items.length * STRONG_BOX)) * 0.8 +
        (storyDone ? 0.1 : 0) +
        (conquered ? 0.1 : 0)
      : 0,
  }
}

// The final exam: every word and phrase, asked so the answer has to be produced.
export function buildExam(profile, topicId, caps) {
  const canSpeak = caps.mic && profile.micOn !== false && profile.level !== 'beginner'
  const items = activeWords(profile, topicId).sort(() => Math.random() - 0.5)
  return items.map((w, i) => {
    let type
    if (profile.level === 'beginner') type = i % 2 ? 'gap' : w.kind === 'phrase' ? 'order' : 'build'
    else type = canSpeak && i % 3 === 2 ? 'speak' : 'type'
    return { kind: 'quiz', wordId: w.id, type, exam: true }
  })
}

// Word Camp and Phrase Cave practice for one island.
export function islandSessionOptions(profile, topicId) {
  const order = profile.topics.indexOf(topicId)
  return { mode: 'island', topicId, allowPhrases: islandState(profile, topicId, order).caveOpen }
}

export function chestProgress(profile) {
  const conquered = profile.topics.filter((t) => isConquered(profile, t)).length
  return { total: profile.topics.length, conquered, ready: conquered === profile.topics.length }
}

// Under the first version islands opened after 3 words on the previous one were answered
// once. Explorers who already got further keep those islands open.
export function legacyOpenCount(profile) {
  let open = Math.min(2, profile.topics.length)
  while (open < profile.topics.length) {
    const prev = profile.topics[open - 1]
    const answered = activeWords(profile, prev).filter((w) => (profile.cards[w.id]?.box ?? 0) >= 2).length
    if (answered < 3) break
    open += 1
  }
  return open
}

