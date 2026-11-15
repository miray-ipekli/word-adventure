import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withTimeout } from '../src/lib/timeout.js'

test('a promise that settles in time passes straight through', async () => {
  assert.equal(await withTimeout(Promise.resolve('ok'), 50), 'ok')
  await assert.rejects(withTimeout(Promise.reject(new Error('wrong pin')), 50), /wrong pin/)
})

test('a promise that never settles (a stuck connection) is cut off with a timeout', async () => {
  const started = Date.now()
  await assert.rejects(withTimeout(new Promise(() => {}), 40), /timeout/)
  assert.ok(Date.now() - started < 1000)
})
