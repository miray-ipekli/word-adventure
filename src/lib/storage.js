// What this browser remembers on its own. Explorers and their progress live in the cloud;
// the copies here make the game start fast and keep working without internet.
import { MANIFEST_MEMBERS } from '../data/manifest.js'

const PREFS = 'word-adventure.prefs'
const SESSION = 'word-adventure.session'
const CACHE = 'word-adventure.cache.'
const PUBLIC = 'word-adventure.public'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be full or blocked (private mode); the game still runs for this visit.
  }
}

export function loadPrefs() {
  const prefs = read(PREFS, null) ?? { sound: true }
  if (!prefs.deviceId) {
    prefs.deviceId = Math.random().toString(36).slice(2, 12)
    write(PREFS, prefs)
  }
  return prefs
}

export const savePrefs = (prefs) => write(PREFS, prefs)

// The explorer currently playing on this device: stays signed in until "Switch explorer".
export const loadSession = () => read(SESSION, null)
export const saveSession = (session) => write(SESSION, session)

// Last known copy of an explorer's progress, plus whether it still needs uploading.
export const loadCache = (id) => read(CACHE + id, null)
export const saveCache = (id, entry) => write(CACHE + id, entry)

// Explorers created on this device that have not reached the cloud yet (created while offline).
// They are listed on the start screen of this device so they can still be opened.
export function loadUnsyncedExplorers() {
  const out = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(CACHE)) continue
      const entry = read(k, null)
      if (entry?.isNew && entry.data) out.push(entry.data)
    }
  } catch {
    // Storage blocked: nothing to list.
  }
  return out
}

export const loadPublicCache = () => read(PUBLIC, [])
export const savePublicCache = (list) => write(PUBLIC, list)

// The canary has no emoji of its own, so it is drawn (CanaryArt.jsx) and saved under this id.
export const CANARY = 'art:canary'

// Avatars are picked group by group: open a group to see its avatars.
export const AVATAR_GROUPS = [
  { id: 'animals', name: 'Animals', avatars: ['🦊', '🐼', '🐯', '🐸', '🦉', '🐙', '🦄', '🐧', '🐨', '🦁', '🐳', '🐝', CANARY] },
  { id: 'manifest', name: 'Manifest', avatars: MANIFEST_MEMBERS.map((m) => m.id) },
]
export const AVATARS = AVATAR_GROUPS.flatMap((g) => g.avatars)

// The group an avatar belongs to; anything unknown falls back to the first group.
export const avatarGroupOf = (avatar) => (AVATAR_GROUPS.find((g) => g.avatars.includes(avatar)) ?? AVATAR_GROUPS[0]).id
// Avatar backgrounds: plain colors, plus yellow and navy vertical stripes (Fenerbahçe colors),
// saved as 'stripes' (the database allows up to 9 characters for the color).
export const STRIPES = 'stripes'
export const AVATAR_COLORS = ['#FF9F68', '#4FA3F7', '#7BD88F', '#FF7EB6', '#8E7CF0', '#F7B32B', '#F25C5C', STRIPES]

// The CSS background for a saved avatar color.
export const avatarBackground = (color) =>
  color === STRIPES ? 'repeating-linear-gradient(90deg, #FFED00 0 16.67%, #13235B 16.67% 33.34%)' : color
