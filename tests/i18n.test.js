import { test } from 'node:test'
import assert from 'node:assert/strict'
import TR from '../src/data/tr.js'
import { defaultLangForLevel, langOf, makeT, translate } from '../src/lib/i18n.js'
import { mergeProgress, newProgress } from '../src/lib/progress.js'
import { allKeys } from './i18n-keys.js'

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

test('every interface text has a Turkish translation', () => {
  const missing = [...allKeys()].filter((k) => !(k in TR))
  assert.deepEqual(missing, [], `Add these to src/data/tr.js:\n${missing.join('\n')}`)
})

test('translations keep the same {placeholders}', () => {
  const broken = Object.entries(TR).filter(([en, tr]) => placeholders(en).join() !== placeholders(tr).join())
  assert.deepEqual(broken, [])
})

test('the Turkish list has no leftover texts that the game no longer uses', () => {
  const used = allKeys()
  const unused = Object.keys(TR).filter((k) => !used.has(k))
  assert.deepEqual(unused, [])
})

test('texts are translated, filled in, and fall back to English', () => {
  assert.equal(translate('tr', 'Play now'), 'Şimdi oyna')
  assert.equal(translate('en', 'Play now'), 'Play now')
  assert.equal(translate('tr', 'Rank {n}', { n: 3 }), 'Rütbe 3')
  assert.equal(translate('tr', 'A text nobody translated'), 'A text nobody translated')
  const t = makeT('en')
  assert.equal(t.plural(1, 'Review {n} word', 'Review {n} words'), 'Review 1 word')
  assert.equal(t.plural(4, 'Review {n} word', 'Review {n} words'), 'Review 4 words')
})

test('beginners start in Turkish, others in English, and old explorers follow their level', () => {
  assert.equal(defaultLangForLevel('beginner'), 'tr')
  assert.equal(defaultLangForLevel('intermediate'), 'en')
  assert.equal(langOf({ level: 'beginner' }), 'tr')
  assert.equal(langOf({ level: 'advanced' }), 'en')
  assert.equal(langOf({ level: 'beginner', lang: 'en' }), 'en')
})

test('the chosen language is saved with the explorer and survives a merge of two devices', () => {
  const base = { id: 'p', name: 'A', avatar: '🦊', color: '#000', level: 'beginner', topics: ['daily'] }
  const p = newProgress({ ...base, lang: 'tr' }, 1000)
  assert.equal(p.lang, 'tr')
  assert.equal('lang' in newProgress(base, 1000), false)
  const later = { ...p, lang: 'en', settingsAt: 2000 }
  assert.equal(mergeProgress(p, later).lang, 'en')
  assert.equal(mergeProgress(later, p).lang, 'en')
})
