import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newProgress, mergeProgress, todayKey } from '../src/lib/progress.js'
import { activeWords, buildSession, applyAnswer, discoverCard } from '../src/lib/srs.js'
import { buildExam, chestProgress, islandKey, islandState, legacyOpenCount, passMark } from '../src/lib/islands.js'

const DAY = 24 * 60 * 60 * 1000
const caps = { tts: true, mic: true }
const topics = ['travel', 'tech', 'music', 'hobbies', 'animals']

function explorer(level = 'intermediate') {
  return { ...newProgress({ id: 'p', name: 'T', avatar: 'x', color: '#000', level, topics }), openIslands: {} }
}

// Puts every item of an island into the given box, due far in the future.
function withBoxes(p, topicId, box, filter = () => true) {
  const cards = { ...p.cards }
  for (const w of activeWords(p, topicId).filter(filter)) cards[w.id] = { box, due: Date.now() + 99 * DAY, lapses: 0, right: 0, wrong: 0, at: 1 }
  return { ...p, cards }
}

const conquer = (p, topicId) => ({ ...p, islands: { ...p.islands, [islandKey(p.level, topicId)]: { storyAt: 1, roleplayAt: 1, examPassedAt: 1 } } })

test('only the first island is open for a new explorer', () => {
  const p = explorer()
  assert.equal(islandState(p, 'travel', 0).unlocked, true)
  assert.equal(islandState(p, 'tech', 1).unlocked, false)
})

test('the next island opens only after the previous one is conquered', () => {
  let p = withBoxes(explorer(), 'travel', 5)
  assert.equal(islandState(p, 'tech', 1).unlocked, false, 'strong words alone are not enough')
  p = conquer(p, 'travel')
  assert.equal(islandState(p, 'tech', 1).unlocked, true)
  assert.equal(islandState(p, 'music', 2).unlocked, false)
})

test('conquered islands stay open, even if the island before them is changed', () => {
  let p = conquer(explorer(), 'music')
  assert.equal(islandState(p, 'music', 2).unlocked, true)
})

test('the Phrase Cave opens once six words were recalled on two days', () => {
  let p = explorer()
  assert.equal(islandState(p, 'travel', 0).caveOpen, false)
  let n = 0
  p = withBoxes(p, 'travel', 3, (w) => w.kind === 'word' && n++ < 5)
  assert.equal(islandState(p, 'travel', 0).caveOpen, false)
  n = 0
  p = withBoxes(p, 'travel', 3, (w) => w.kind === 'word' && n++ < 6)
  assert.equal(islandState(p, 'travel', 0).caveOpen, true)
})

test('island sessions only introduce phrases when the cave is open', () => {
  const p = explorer()
  const closed = buildSession(p, { mode: 'island', topicId: 'travel', caps, allowPhrases: false, size: 40 })
  assert.ok(closed.every((s) => !s.wordId.includes('.p.')))
  const open = withBoxes(p, 'travel', 3, (w) => w.kind === 'word')
  const steps = buildSession(open, { mode: 'island', topicId: 'travel', caps, allowPhrases: true, size: 40 })
  assert.ok(steps.some((s) => s.kind === 'discover' && s.wordId.includes('.p.')))
})

test('the Story Tower opens once every word and phrase was seen', () => {
  let p = withBoxes(explorer(), 'travel', 1, (w) => w.kind === 'word')
  assert.equal(islandState(p, 'travel', 0).towerOpen, false)
  p = withBoxes(p, 'travel', 1)
  assert.equal(islandState(p, 'travel', 0).towerOpen, true)
})

test('the Castle needs every item strong and the story read', () => {
  let p = withBoxes(explorer(), 'travel', 4)
  assert.equal(islandState(p, 'travel', 0).castleOpen, false)
  p = withBoxes(p, 'travel', 5)
  assert.equal(islandState(p, 'travel', 0).castleOpen, false, 'story not read yet')
  p = { ...p, islands: { [islandKey('intermediate', 'travel')]: { storyAt: 1 } } }
  assert.equal(islandState(p, 'travel', 0).castleOpen, true)
})

test('a brand-new island needs at least 4 days to reach the castle', () => {
  const s = islandState(explorer(), 'travel', 0)
  assert.equal(s.etaDays, 4, 'discover today, then 10 min + 1 day + 2 days of waiting, rounded up')
  // Simulate the fastest possible path: answer every word the moment it is due.
  let card = discoverCard(false, 0)
  let now = 0
  const days = new Set([Math.floor(now / DAY)])
  while (card.box < 5) {
    now = Math.max(now, card.due)
    card = applyAnswer(card, true, now)
    days.add(Math.floor(now / DAY))
  }
  assert.ok(now >= 3 * DAY && now < 4 * DAY, 'box 5 is reached on day 3, i.e. the fourth day')
  assert.equal(days.size, 3, 'recalled correctly on three different days')
})

test('a failed exam blocks the castle until tomorrow', () => {
  let p = withBoxes(explorer(), 'travel', 5)
  p = { ...p, islands: { [islandKey('intermediate', 'travel')]: { storyAt: 1, roleplayAt: 1, examFailedOn: todayKey() } } }
  assert.equal(islandState(p, 'travel', 0).examBlocked, true)
  p = { ...p, islands: { [islandKey('intermediate', 'travel')]: { storyAt: 1, roleplayAt: 1, examFailedOn: '2020-01-01' } } }
  assert.equal(islandState(p, 'travel', 0).examBlocked, false)
})

test('the exam asks for every item by recall, without speaking for beginners', () => {
  const adv = buildExam(explorer('intermediate'), 'travel', caps)
  assert.equal(adv.length, 18)
  assert.ok(adv.every((s) => s.exam && ['type', 'speak'].includes(s.type)))
  const kid = buildExam(explorer('beginner'), 'travel', caps)
  assert.ok(kid.every((s) => s.type !== 'speak'))
  assert.equal(passMark('beginner'), 0.7)
  assert.equal(passMark('advanced'), 0.85)
})

test('the treasure chest opens when all five islands are conquered', () => {
  let p = explorer()
  for (const t of topics.slice(0, 4)) p = conquer(p, t)
  assert.equal(chestProgress(p).ready, false)
  p = conquer(p, 'animals')
  assert.deepEqual(chestProgress(p), { total: 5, conquered: 5, ready: true })
})

test('explorers from before keep the islands the old rule had opened', () => {
  let p = { ...explorer() }
  delete p.openIslands
  assert.equal(legacyOpenCount(p), 2, 'the first two islands were always open')
  let n = 0
  p = withBoxes(p, 'tech', 2, (w) => w.kind === 'word' && n++ < 3)
  assert.equal(legacyOpenCount(p), 3)
  p.openIslands = { intermediate: 3 }
  assert.equal(islandState(p, 'music', 2).unlocked, true)
  assert.equal(islandState(p, 'hobbies', 3).unlocked, false)
})

test('island records from two devices merge, keeping each step that was reached', () => {
  const key = islandKey('intermediate', 'travel')
  const phone = { ...explorer(), islands: { [key]: { storyAt: 100, examFailedOn: '2026-10-30' } } }
  const web = { ...explorer(), islands: { [key]: { roleplayAt: 200, examFailedOn: '2026-10-31', examPassedAt: 300 } } }
  const m = mergeProgress(phone, web)
  assert.deepEqual(m.islands[key], { storyAt: 100, roleplayAt: 200, examFailedOn: '2026-10-31', examPassedAt: 300 })
  assert.deepEqual(mergeProgress(web, phone).islands[key], m.islands[key])
})

test('a missing openIslands value is never written as undefined', () => {
  const a = explorer()
  const b = explorer()
  delete a.openIslands
  delete b.openIslands
  assert.equal('openIslands' in mergeProgress(a, b), false)
  assert.deepEqual(mergeProgress(a, { ...b, openIslands: { beginner: 3 } }).openIslands, { beginner: 3 })
})
