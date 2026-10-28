// Cloud storage in Firestore.
//
// profiles/{id}   name, avatar, level, rank, streak: shown to everyone on the start screen
// progress/{key}  everything else. `key` is a SHA-256 of the profile id and its PIN, so only
//                 someone who knows the PIN can find it. The PIN itself is never stored.
import { collection, deleteDoc, doc, getDoc, onSnapshot, runTransaction, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'
import { mergeProgress, publicFields } from './progress.js'

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

export async function createProfile(progress, pin) {
  const key = await keyFor(progress.id, pin)
  const batch = writeBatch(db)
  batch.set(doc(db, 'progress', key), { profileId: progress.id, data: progress, updatedAt: Date.now() })
  batch.set(doc(db, 'profiles', progress.id), publicFields(progress))
  await batch.commit()
  return key
}

// Returns the explorer's progress, or null when the PIN is wrong.
export async function unlock(profileId, key) {
  const snap = await getDoc(doc(db, 'progress', key))
  if (!snap.exists() || snap.data().profileId !== profileId) return null
  return snap.data().data
}

// Merges local progress with whatever another device saved meanwhile, then writes it back.
export async function saveProgress(key, local) {
  const ref = doc(db, 'progress', key)
  const merged = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const result = mergeProgress(local, snap.exists() ? snap.data().data : null)
    tx.set(ref, { profileId: local.id, data: result, updatedAt: Date.now() })
    return result
  })
  await setDoc(doc(db, 'profiles', local.id), publicFields(merged))
  return merged
}

export async function changePin(progress, oldKey, newPin) {
  const newKey = await keyFor(progress.id, newPin)
  await setDoc(doc(db, 'progress', newKey), { profileId: progress.id, data: progress, updatedAt: Date.now() })
  await deleteDoc(doc(db, 'progress', oldKey))
  return newKey
}

export async function deleteProfile(progress, key) {
  await setDoc(doc(db, 'profiles', progress.id), { ...publicFields(progress), hidden: true })
  await deleteDoc(doc(db, 'progress', key))
}
