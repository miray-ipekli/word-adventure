import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as P from '../src/lib/progress.js'

const base = P.newProgress({ id: 'p1', name: 'Miray', avatar: 'x', color: '#000', level: 'intermediate', topics: ['travel'] }, 1000)

test('words played on different devices are all kept', () => {
  const phone = { ...base, cards: { a: { box: 2, at: 10 } } }
  const web = { ...base, cards: { b: { box: 1, at: 20 } } }
  assert.deepEqual(Object.keys(P.mergeProgress(phone, web).cards).sort(), ['a', 'b'])
})

test('the newer answer to the same word wins, in either order', () => {
  const phone = { ...base, cards: { a: { box: 4, at: 50 } } }
  const web = { ...base, cards: { a: { box: 1, at: 40 } } }
  assert.equal(P.mergeProgress(phone, web).cards.a.box, 4)
  assert.equal(P.mergeProgress(web, phone).cards.a.box, 4)
})

test('XP from each device adds up and is never counted twice', () => {
  let phone = P.awardXp(base, 30, 'phone', '2026-10-28')
  phone = P.awardXp(phone, 20, 'phone', '2026-10-29')
  const web = P.awardXp(base, 15, 'web', '2026-10-29')
  const m = P.mergeProgress(phone, web)
  assert.equal(P.totalXp(m), 65)
  assert.equal(P.todayXp(m, '2026-10-29'), 35)
  assert.equal(P.totalXp(P.mergeProgress(m, phone)), 65)
  assert.deepEqual(P.mergeProgress(m, m), m)
})

test('the streak counts days played on any device', () => {
  const phone = P.awardXp(base, 30, 'phone', '2026-10-28')
  const web = P.awardXp(base, 15, 'web', '2026-10-29')
  const m = P.mergeProgress(phone, web)
  assert.equal(P.liveStreak(m, '2026-10-29'), 2)
  assert.equal(P.liveStreak(m, '2026-10-30'), 2, 'still alive until the next day ends')
  assert.equal(P.liveStreak(m, '2026-11-01'), 0)
})

test('the newer settings win', () => {
  const newer = { ...base, level: 'advanced', settingsAt: 5000 }
  const older = { ...base, level: 'beginner', topics: ['food'], settingsAt: 4000 }
  const m = P.mergeProgress(older, newer)
  assert.equal(m.level, 'advanced')
  assert.deepEqual(m.topics, ['travel'])
})

test('a deleted own word stays deleted until it is added again', () => {
  const added = { ...base, custom: [{ id: 'c1', en: 'brainstorm', at: 100 }], cards: { c1: { box: 2, at: 110 } } }
  const deleted = { ...base, custom: [], removed: { c1: 200 } }
  const m = P.mergeProgress(added, deleted)
  assert.equal(m.custom.length, 0)
  assert.equal(m.cards.c1, undefined)
  const readded = { ...base, custom: [{ id: 'c1', en: 'brainstorm', at: 300 }] }
  assert.equal(P.mergeProgress(m, readded).custom.length, 1)
})

test('an explorer from the device-only version keeps words, XP and streak', () => {
  const legacy = {
    id: 'old1', name: 'Defne', avatar: 'y', color: '#111', level: 'beginner', topics: ['animals'], xp: 120, dailyGoal: 30,
    today: { date: '2026-10-28', xp: 40 }, streak: { count: 3, last: '2026-10-28' }, cards: { w: { box: 3, due: 0 } }, custom: [], createdAt: 7,
  }
  const p = P.fromLegacy(legacy, 'phone', 999)
  assert.equal(p.id, 'old1')
  assert.equal(P.totalXp(p), 120)
  assert.equal(P.liveStreak(p, '2026-10-28'), 3)
  assert.equal(P.todayXp(p, '2026-10-28'), 40)
  assert.equal(p.cards.w.box, 3)
  assert.equal(p.cards.w.at, 999)
  assert.equal(p.dailyGoal, 30)
})

test('the public card has exactly the fields the database rules allow', () => {
  const pub = P.publicFields(base, 1234)
  assert.deepEqual(Object.keys(pub).sort(), ['avatar', 'color', 'createdAt', 'hidden', 'level', 'name', 'rank', 'streak', 'updatedAt'])
  for (const k of ['rank', 'streak', 'createdAt', 'updatedAt']) assert.ok(Number.isInteger(pub[k]), k)
})
