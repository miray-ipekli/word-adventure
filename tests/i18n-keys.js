// Collects every interface text that goes through t(): literal t('…') and t.plural(n, '…', '…') calls
// in src/, plus the label tables that are translated where they are shown.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { LEVELS, TOPICS, CUSTOM_TOPIC } from '../src/data/topics.js'
import { QUESTION_LABEL } from '../src/lib/srs.js'
import { MIC_ERRORS } from '../src/lib/speech.js'
import { AVATAR_GROUPS } from '../src/lib/storage.js'

const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]))

// A JS string literal in single or double quotes (with escapes).
const STR = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"`
const unquote = (s) => s.slice(1, -1).replace(/\\(.)/g, '$1')

// Tables of labels that the components pass through t() when they show them.
const TABLES = ['PRAISE', 'STEPS', 'FILTERS', 'STATUS_LABEL', 'GOALS', 'SYNC_LABEL', 'OFFLINE_MSG']

export function literalKeys() {
  const keys = new Set()
  for (const f of files('src').filter((f) => /\.(jsx?|mjs)$/.test(f) && !f.endsWith('tr.js'))) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(new RegExp(String.raw`\bt\(\s*(${STR})`, 'g'))) keys.add(unquote(m[1]))
    for (const m of src.matchAll(new RegExp(String.raw`\bt\.plural\([^,]+,\s*(${STR})\s*,\s*(${STR})`, 'g'))) {
      keys.add(unquote(m[1]))
      keys.add(unquote(m[2]))
    }
    for (const name of TABLES) {
      const m = src.match(new RegExp(String.raw`const ${name}\s*=\s*([\s\S]*?)\n\n`))
      if (!m) continue
      for (const s of m[1].matchAll(new RegExp(STR, 'g'))) {
        const v = unquote(s[0])
        // keep texts, skip ids like 'all' or 'saving'
        if (/[A-Z ★·…!?.]/.test(v)) keys.add(v)
      }
    }
  }
  return keys
}

export function dataKeys() {
  return new Set([
    ...LEVELS.flatMap((l) => [l.name, l.blurb]),
    ...TOPICS.map((t) => t.name),
    CUSTOM_TOPIC.name,
    ...Object.values(QUESTION_LABEL),
    ...Object.values(MIC_ERRORS),
    ...AVATAR_GROUPS.map((g) => g.name),
    // texts picked in code (t(cond ? a : b)) or passed as props, translated where they are shown
    'Not quite',
    'Castle exam',
    'Tricky words',
    'Starred words',
    'Daily review',
    'Listen',
    'Listen to the sentence',
    'Listen first',
    'Something went wrong with the microphone.',
    "The PINs didn't match. Let's start again.",
    'Wrong PIN. Try again.',
    "Can't reach the cloud. Check your internet connection.",
  ])
}

export const allKeys = () => new Set([...literalKeys(), ...dataKeys()])
