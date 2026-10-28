// The explorer's progress and how two copies of it are merged. Kept free of browser and
// Firebase code so it can be tested on its own.
//
// Everything is built so that merging is safe in any order:
// - each word card carries `at` (last change time); the newer card wins
// - own words carry `at`; deletions are remembered in `removed` with their time
// - XP is kept per device, because each device only ever adds to its own counter
// - settings (name, level, islands...) carry one `settingsAt`; the newer set wins
// - island records (story read, exam passed...) only move forward, so the later time wins

export const SETTINGS = ['name', 'avatar', 'color', 'level', 'topics', 'dailyGoal', 'micOn']

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

export function newProgress({ id, name, avatar, color, level, topics }, now = Date.now()) {
  return {
    id,
    name,
    avatar,
    color,
    level,
    topics,
    dailyGoal: 50,
    micOn: true,
    settingsAt: now,
    cards: {},
    custom: [],
    removed: {},
    xpLog: {},
    islands: {},
    openIslands: {},
    createdAt: now,
  }
}

export function totalXp(p) {
  return Object.values(p.xpLog ?? {}).reduce((sum, d) => sum + (d.total ?? 0), 0)
}

export function todayXp(p, key = todayKey()) {
  return Object.values(p.xpLog ?? {}).reduce((sum, d) => sum + (d.days?.[key] ?? 0), 0)
}

// Consecutive days with any practice, counting back from today (or yesterday).
export function liveStreak(p, key = todayKey()) {
  const active = new Set(Object.values(p.xpLog ?? {}).flatMap((d) => Object.keys(d.days ?? {})))
  const day = new Date(key)
  if (!active.has(key)) day.setDate(day.getDate() - 1)
  let count = 0
  while (active.has(todayKey(day))) {
    count += 1
    day.setDate(day.getDate() - 1)
  }
  return count
}

export function awardXp(p, amount, deviceId, key = todayKey()) {
  const mine = p.xpLog?.[deviceId] ?? { total: 0, days: {} }
  return {
    ...p,
    xpLog: {
      ...p.xpLog,
      [deviceId]: { total: mine.total + amount, days: { ...mine.days, [key]: (mine.days[key] ?? 0) + amount } },
    },
  }
}

// Explorer rank grows with XP: each rank needs a bit more than the last.
export function rankInfo(xp) {
  let rank = 1
  let need = 100
  let floor = 0
  while (xp >= floor + need) {
    floor += need
    rank += 1
    need = 100 + (rank - 1) * 50
  }
  return { rank, into: xp - floor, need }
}

// The part of a profile everyone can see on the "Who's exploring" screen.
export function publicFields(p, now = Date.now()) {
  return {
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    level: p.level,
    rank: rankInfo(totalXp(p)).rank,
    streak: liveStreak(p),
    hidden: false,
    createdAt: p.createdAt,
    updatedAt: now,
  }
}

export function mergeProgress(a, b) {
  if (!a) return b
  if (!b) return a
  const settingsFrom = (b.settingsAt ?? 0) > (a.settingsAt ?? 0) ? b : a

  const cards = { ...a.cards }
  for (const [id, card] of Object.entries(b.cards ?? {})) {
    if (!cards[id] || (card.at ?? 0) > (cards[id].at ?? 0)) cards[id] = card
  }

  const removed = { ...a.removed }
  for (const [id, at] of Object.entries(b.removed ?? {})) removed[id] = Math.max(removed[id] ?? 0, at)

  const custom = new Map()
  for (const w of [...(a.custom ?? []), ...(b.custom ?? [])]) {
    const prev = custom.get(w.id)
    if (!prev || (w.at ?? 0) > (prev.at ?? 0)) custom.set(w.id, w)
  }
  for (const [id, w] of custom) {
    if ((removed[id] ?? -1) >= (w.at ?? 0)) {
      custom.delete(id)
      delete cards[id]
    }
  }

  const xpLog = { ...a.xpLog }
  for (const [device, log] of Object.entries(b.xpLog ?? {})) {
    const mine = xpLog[device]
    if (!mine) {
      xpLog[device] = log
      continue
    }
    const days = { ...mine.days }
    for (const [d, xp] of Object.entries(log.days ?? {})) days[d] = Math.max(days[d] ?? 0, xp)
    xpLog[device] = { total: Math.max(mine.total, log.total), days }
  }

  const islands = { ...a.islands }
  for (const [key, rec] of Object.entries(b.islands ?? {})) {
    const mine = islands[key] ?? {}
    const out = { ...mine }
    for (const [field, value] of Object.entries(rec)) {
      out[field] = mine[field] == null || value > mine[field] ? value : mine[field]
    }
    islands[key] = out
  }

  // Explorers from before island conquest keep the islands they had already opened.
  let openIslands = a.openIslands ?? b.openIslands
  if (a.openIslands && b.openIslands) {
    openIslands = { ...a.openIslands }
    for (const [level, n] of Object.entries(b.openIslands)) openIslands[level] = Math.max(openIslands[level] ?? 0, n)
  }

  const merged = {
    ...a,
    islands,
    cards,
    custom: [...custom.values()],
    removed,
    xpLog,
    settingsAt: settingsFrom.settingsAt,
    createdAt: Math.min(a.createdAt ?? Infinity, b.createdAt ?? Infinity),
  }
  for (const k of SETTINGS) merged[k] = settingsFrom[k]
  // Firestore refuses undefined values, so leave the field out until it is known.
  if (openIslands) merged.openIslands = openIslands
  else delete merged.openIslands
  return merged
}
