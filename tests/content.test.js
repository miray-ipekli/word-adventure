import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_ITEMS, LEVELS, TOPICS, islandContent } from '../src/data/topics.js'
import { gapSentence } from '../src/lib/srs.js'

const v1Ids = JSON.parse(readFileSync(new URL('./fixtures/v1-word-ids.json', import.meta.url)))
const words = (s) => s.split(/\s+/).filter(Boolean)
const spoken = (line) => line.replace(/^[A-Z][\w ]{0,20}:\s*/, '')

test('every word from the first version keeps its id, so saved progress still matches', () => {
  const ids = new Set(ALL_ITEMS.map((w) => w.id))
  for (const id of v1Ids) assert.ok(ids.has(id), `missing ${id}`)
})

test('item ids are unique', () => {
  const seen = new Set()
  for (const w of ALL_ITEMS) {
    assert.ok(!seen.has(w.id), `duplicate ${w.id}`)
    seen.add(w.id)
  }
})

for (const topic of TOPICS) {
  for (const level of LEVELS) {
    test(`${topic.id} · ${level.id}`, () => {
      const items = ALL_ITEMS.filter((w) => w.topic === topic.id && w.level === level.id)
      assert.equal(items.filter((w) => w.kind === 'word').length, 12, 'word count')
      assert.equal(items.filter((w) => w.kind === 'phrase').length, 6, 'phrase count')
      for (const w of items) {
        assert.ok(w.en && w.tr && w.ex, `incomplete ${w.id}`)
        assert.ok(gapSentence(w), `example of "${w.en}" does not contain it: ${w.ex}`)
      }
      const english = new Set()
      for (const w of items) {
        assert.ok(!english.has(w.en.toLowerCase()), `"${w.en}" twice`)
        english.add(w.en.toLowerCase())
      }

      const { story, roleplay } = islandContent(topic.id, level.id)
      assert.ok(story.title && story.lines.length >= 6, 'story too short')
      assert.equal(story.questions.length, 4, 'story questions')
      for (const [q, options, answer] of story.questions) {
        assert.ok(q.endsWith('?'), `question: ${q}`)
        assert.equal(options.length, 3, `options for ${q}`)
        assert.ok(answer >= 0 && answer < 3, `answer for ${q}`)
        assert.equal(new Set(options).size, 3, `duplicate options for ${q}`)
      }
      assert.equal(story.build.length, 3, 'sentence builds')
      const storyText = story.lines.map(spoken).join(' ')
      for (const s of story.build) {
        assert.ok(storyText.includes(s), `build sentence not in story: ${s}`)
        assert.ok(words(s).length >= 4 && words(s).length <= 14, `build length: ${s}`)
      }
      const used = items.filter((w) => storyText.toLowerCase().includes(w.en.toLowerCase().split(' ')[0])).length
      assert.ok(used >= 6, `story uses only ${used} island words`)

      assert.ok(roleplay.title && roleplay.scene, 'role-play title and scene')
      const yours = roleplay.lines.filter((l) => l[0] === 'you')
      assert.ok(yours.length >= (level.id === 'beginner' ? 3 : 4), 'role-play needs more of your lines')
      for (const l of roleplay.lines) {
        assert.ok(['npc', 'you'].includes(l[0]), `speaker ${l[0]}`)
        if (l[0] === 'you') {
          assert.ok(l[2], `hint missing: ${l[1]}`)
          assert.ok(words(l[1]).length <= 16, `line too long to say: ${l[1]}`)
        }
      }
    })
  }
}
