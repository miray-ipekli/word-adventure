import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AVATARS, AVATAR_GROUPS, avatarGroupOf, CANARY } from '../src/lib/storage.js'
import { isManifestAvatar, manifestMember, MANIFEST_MEMBERS } from '../src/data/manifest.js'

test('every avatar fits the 16 characters the database rules allow, and none repeats', () => {
  for (const a of AVATARS) assert.ok(a.length <= 16, a)
  assert.equal(new Set(AVATARS).size, AVATARS.length)
})

test('all six Manifest members can be picked as avatars', () => {
  assert.equal(MANIFEST_MEMBERS.length, 6)
  for (const m of MANIFEST_MEMBERS) {
    assert.ok(AVATARS.includes(m.id))
    assert.ok(isManifestAvatar(m.id))
    assert.equal(manifestMember(m.id), m)
  }
})

test('emoji avatars saved before are not mistaken for Manifest ones', () => {
  assert.equal(isManifestAvatar('🦊'), false)
  assert.equal(manifestMember('🦊'), null)
  assert.equal(isManifestAvatar(undefined), false)
})

test('avatars are grouped into Animals and Manifest, each avatar in exactly one group', () => {
  assert.deepEqual(
    AVATAR_GROUPS.map((g) => g.id),
    ['animals', 'manifest'],
  )
  const all = AVATAR_GROUPS.flatMap((g) => g.avatars)
  assert.equal(new Set(all).size, all.length)
  assert.equal(avatarGroupOf('🦊'), 'animals')
  assert.equal(avatarGroupOf('mf:mina'), 'manifest')
  // an avatar from an older version opens the first group
  assert.equal(avatarGroupOf('🤖'), 'animals')
})

test('the drawn canary is an animal avatar that fits the database rules', () => {
  assert.equal(avatarGroupOf(CANARY), 'animals')
  assert.ok(CANARY.length <= 16)
  assert.equal(isManifestAvatar(CANARY), false)
})
