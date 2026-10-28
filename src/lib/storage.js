// What this browser remembers on its own. Explorers and their progress live in the cloud;
// the copies here make the game start fast and keep working without internet.
const PREFS = 'word-adventure.prefs'
const SESSION = 'word-adventure.session'
const CACHE = 'word-adventure.cache.'
const PUBLIC = 'word-adventure.public'
// Saved by the first version of the game, before explorers moved to the cloud.
const LEGACY = 'word-adventure.v1'

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
  const prefs = read(PREFS, null) ?? { sound: read(LEGACY, {}).sound ?? true }
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

export const loadPublicCache = () => read(PUBLIC, [])
export const savePublicCache = (list) => write(PUBLIC, list)

export function loadLegacy() {
  return read(LEGACY, { profiles: [] }).profiles ?? []
}

export function removeLegacy(id) {
  const store = read(LEGACY, null)
  if (!store) return
  const profiles = store.profiles.filter((p) => p.id !== id)
  write(LEGACY, profiles.length ? { ...store, profiles, activeId: null } : null)
}

export const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🦉', '🐙', '🦄', '🐧', '🐨', '🦁', '🐳', '🐝']
export const AVATAR_COLORS = ['#FF9F68', '#4FA3F7', '#2EC4A6', '#FF7EB6', '#8E7CF0', '#F7B32B']
