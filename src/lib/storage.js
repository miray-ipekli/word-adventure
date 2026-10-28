// Profiles live in this browser's localStorage. Each device keeps its own explorers.
const KEY = 'word-adventure.v1'

const empty = () => ({ profiles: [], activeId: null, sound: true })

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    return { ...empty(), ...JSON.parse(raw) }
  } catch {
    return empty()
  }
}

export function saveStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Storage can be full or blocked (private mode); the game still runs for this visit.
  }
}

export const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🦉', '🐙', '🦄', '🐧', '🐨', '🦁', '🐳', '🐝']
export const AVATAR_COLORS = ['#FF9F68', '#4FA3F7', '#2EC4A6', '#FF7EB6', '#8E7CF0', '#F7B32B']

export function newProfile({ name, avatar, color, level, topics }) {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name,
    avatar,
    color,
    level,
    topics,
    dailyGoal: 50,
    xp: 0,
    today: { date: todayKey(), xp: 0 },
    streak: { count: 0, last: null },
    cards: {},
    custom: [],
    createdAt: Date.now(),
  }
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

// Adds XP and keeps the daily total and the streak up to date.
export function awardXp(profile, amount) {
  const key = todayKey()
  const today = profile.today?.date === key ? profile.today : { date: key, xp: 0 }
  let streak = profile.streak
  if (streak.last !== key) {
    const gap = streak.last ? dayDiff(streak.last, key) : null
    streak = { count: gap === 1 ? streak.count + 1 : 1, last: key }
  }
  return { ...profile, xp: profile.xp + amount, today: { ...today, xp: today.xp + amount }, streak }
}

// A streak is only "alive" if the player practiced today or yesterday.
export function liveStreak(profile) {
  const { count, last } = profile.streak
  if (!last) return 0
  return dayDiff(last, todayKey()) <= 1 ? count : 0
}

export function todayXp(profile) {
  return profile.today?.date === todayKey() ? profile.today.xp : 0
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
