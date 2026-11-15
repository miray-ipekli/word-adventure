// Cloud storage in Firestore.
//
// profiles/{id}   name, avatar, level, rank, streak: shown to everyone on the start screen
// progress/{key}  everything else. `key` is a SHA-256 of the profile id and its PIN, so only
//                 someone who knows the PIN can find it. The PIN itself is never stored.
import { collection, deleteDoc, doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { mergeProgress, publicFields } from './progress.js'
import { withTimeout } from './timeout.js'

export async function keyFor(profileId, pin) {
  const bytes = new TextEncoder().encode(`${profileId}:${pin}:word-adventure`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function newProfileId() {
  return Math.random().toString(36).slice(2, 12)
}

export function watchProfiles(onList, onError) {
  return onSnapshot(
    collection(db, 'profiles'),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => !p.hidden)
        .sort((a, b) => a.createdAt - b.createdAt)
      onList(list)
    },
    onError,
  )
}

// How long a PIN check waits for the cloud before giving up, so the screen never hangs on "Checking…".
export const UNLOCK_TIMEOUT = 15000

// Returns the explorer's progress, or null when the PIN is wrong.
export async function unlock(profileId, key) {
  const snap = await withTimeout(getDoc(doc(db, 'progress', key)), UNLOCK_TIMEOUT)
  if (!snap.exists() || snap.data().profileId !== profileId) return null
  return snap.data().data
}

// Merges local progress with whatever another device saved meanwhile, then writes it back.
// For a brand-new explorer this is also what first puts them in the cloud.
// Only a brand-new explorer may create their progress document (`allowCreate`). For anyone else a
// missing document means the PIN was changed or the explorer was deleted on another device, so the
// save stops with code 'gone' instead of bringing the old copy back.
export async function saveProgress(key, local, { allowCreate = false } = {}) {
  const ref = doc(db, 'progress', key)
  const merged = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists() && !allowCreate) throw Object.assign(new Error('progress is gone'), { code: 'gone' })
    const result = mergeProgress(local, snap.exists() ? snap.data().data : null)
    tx.set(ref, { profileId: local.id, data: result, updatedAt: Date.now() })
    return result
  })
  await setDoc(doc(db, 'profiles', local.id), publicFields(merged))
  return merged
}

// Changing the PIN and deleting an explorer wait for the cloud's answer, with a limit so the
// screen shows "try again" instead of hanging when the connection is stuck.
export const CLOUD_TIMEOUT = 15000

export async function changePin(progress, oldKey, newPin) {
  const newKey = await keyFor(progress.id, newPin)
  await withTimeout(setDoc(doc(db, 'progress', newKey), { profileId: progress.id, data: progress, updatedAt: Date.now() }), CLOUD_TIMEOUT)
  await withTimeout(deleteDoc(doc(db, 'progress', oldKey)), CLOUD_TIMEOUT)
  return newKey
}

export async function deleteProfile(progress, key) {
  await withTimeout(setDoc(doc(db, 'profiles', progress.id), { ...publicFields(progress), hidden: true }), CLOUD_TIMEOUT)
  await withTimeout(deleteDoc(doc(db, 'progress', key)), CLOUD_TIMEOUT)
}
