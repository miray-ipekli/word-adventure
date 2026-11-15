import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeProgress, newProgress } from '../src/lib/progress.js'
import { activeWords, buildSession, isStarred, STARRED_IN_REVIEW, starredWords } from '../src/lib/srs.js'

const DAY = 24 * 60 * 60 * 1000
const caps = { tts: true, mic: true }

function explorer() {
  return newProgress({ id: 'p', name: 'T', avatar: 'x', color: '#000', level: 'intermediate', topics: ['travel', 'tech', 'music', 'hobbies', 'animals'] })
}

// Every travel word known well and not due for a long time; the first `n` are starred.
function withStars(n) {
  const p = explorer()
  const words = activeWords(p, 'travel').filter((w) => w.kind === 'word')
  for (const w of words) p.cards[w.id] = { box: 5, due: Date.now() + 30 * DAY, lapses: 0, right: 3, wrong: 0, at: 1 }
  words.slice(0, n).forEach((w) => (p.starred[w.id] = { on: true, at: 1 }))
  return { p, words }
}

test('starred words can be listed, and removed stars are not', () => {
  const { p, words } = withStars(3)
  p.starred[words[0].id] = { on: false, at: 2 }
  assert.deepEqual(
    starredWords(p).map((w) => w.id),
    [words[1].id, words[2].id],
  )
  assert.equal(isStarred(p, words[0].id), false)
})

test('the starred session practices every starred word, even when nothing is due', () => {
  const { p } = withStars(5)
  const steps = buildSession(p, { mode: 'starred', caps })
  assert.equal(steps.length, 5)
  assert.ok(steps.every((s) => s.practice && s.starred && s.kind === 'quiz'))
})

test('a daily review adds a few starred words that are not due', () => {
  const { p, words } = withStars(6)
  // two other words are due, so there is a real review to mix into
  for (const w of activeWords(p, 'tech').slice(0, 2)) p.cards[w.id] = { box: 3, due: 0, lapses: 0, right: 1, wrong: 0, at: 1 }
  const steps = buildSession(p, { mode: 'review', caps })
  const extra = steps.filter((s) => s.starred)
  assert.equal(extra.length, STARRED_IN_REVIEW)
  assert.ok(extra.every((s) => s.practice && words.some((w) => w.id === s.wordId)))
  assert.equal(steps.filter((s) => !s.starred).length, 2)
})

test('the latest star or unstar wins when two devices merge', () => {
  const a = { ...explorer(), starred: { w1: { on: true, at: 10 }, w2: { on: true, at: 10 } } }
  const b = { ...explorer(), starred: { w1: { on: false, at: 20 }, w3: { on: true, at: 5 } } }
  const m = mergeProgress(a, b)
  assert.deepEqual(m.starred, { w1: { on: false, at: 20 }, w2: { on: true, at: 10 }, w3: { on: true, at: 5 } })
  assert.deepEqual(mergeProgress(b, a).starred, m.starred)
})

test('explorers saved before stars existed merge without errors', () => {
  const old = explorer()
  delete old.starred
  const m = mergeProgress(old, { ...explorer(), starred: { w1: { on: true, at: 1 } } })
  assert.deepEqual(m.starred, { w1: { on: true, at: 1 } })
  assert.deepEqual(mergeProgress(old, old).starred, {})
})
