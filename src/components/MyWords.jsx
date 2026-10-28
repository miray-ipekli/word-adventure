import { useMemo, useState } from 'react'
import { CUSTOM_TOPIC, topicById } from '../data/topics.js'
import { activeWords, statusOf, trickyWords } from '../lib/srs.js'
import { play } from '../lib/sound.js'
import { SpeakerButton } from './Questions.jsx'

const FILTERS = [
  { id: 'all', name: 'All' },
  { id: 'tricky', name: 'Tricky' },
  { id: 'learning', name: 'Learning' },
  { id: 'mastered', name: 'Mastered' },
  { id: 'mine', name: 'My own' },
]
const STATUS_LABEL = { new: 'Not discovered', learning: 'Learning', tricky: 'Tricky', mastered: 'Mastered' }

export default function MyWords({ profile, actions, onAdd, onRemove, onPractice, onExit }) {
  const [form, setForm] = useState({ en: '', tr: '', ex: '' })
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [added, setAdded] = useState('')

  const words = useMemo(
    () => [...activeWords(profile, CUSTOM_TOPIC.id), ...profile.topics.flatMap((t) => activeWords(profile, t))],
    [profile],
  )
  const tricky = trickyWords(profile)
  const q = query.trim().toLowerCase()
  const shown = words.filter((w) => {
    const s = statusOf(profile.cards[w.id])
    if (filter === 'mine' && w.topic !== CUSTOM_TOPIC.id) return false
    if (!['all', 'mine'].includes(filter) && s !== filter) return false
    if (q && !w.en.toLowerCase().includes(q) && !w.tr.toLowerCase().includes(q)) return false
    return true
  })

  const submit = (e) => {
    e.preventDefault()
    const en = form.en.trim()
    const tr = form.tr.trim()
    if (!en || !tr) return
    const exists = words.some((w) => w.en.toLowerCase() === en.toLowerCase())
    if (exists) {
      setAdded(`“${en}” is already on your map.`)
      return
    }
    onAdd({ id: `custom.${Date.now().toString(36)}`, en, tr, ex: form.ex.trim() })
    play('discover')
    setAdded(`“${en}” was added to My Island. It will show up in your next adventure there.`)
    setForm({ en: '', tr: '', ex: '' })
  }

  return (
    <div className="screen page-screen">
      <header className="page-top">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Back to the map">
          ←
        </button>
        <h1 className="title-lg">My words</h1>
      </header>

      <div className="page-grid">
        <section className="panel sticker">
          <h2 className="title-md">Add a word you heard</h2>
          <p className="muted">From a series, a meeting or a song. It goes to My Island and follows the same review steps.</p>
          <form className="add-form" onSubmit={submit}>
            <label className="field">
              <span className="field-label">English</span>
              <input id="add-en" className="input" value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} placeholder="e.g. brainstorm" />
            </label>
            <label className="field">
              <span className="field-label">Turkish</span>
              <input id="add-tr" className="input" value={form.tr} onChange={(e) => setForm({ ...form, tr: e.target.value })} placeholder="e.g. beyin fırtınası" />
            </label>
            <label className="field">
              <span className="field-label">Example sentence (optional)</span>
              <input
                id="add-ex"
                className="input"
                value={form.ex}
                onChange={(e) => setForm({ ...form, ex: e.target.value })}
                placeholder="e.g. Let's brainstorm some ideas."
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={!form.en.trim() || !form.tr.trim()}>
              Add to My Island
            </button>
            {added && (
              <p className="success-note" role="status">
                {added}
              </p>
            )}
          </form>

          <div className="quest quest-boss inset">
            <h3>Tricky words: {tricky.length}</h3>
            <p className="muted">Tap “Practice” on any word below to send it to the boss fight.</p>
            <button type="button" className="btn btn-boss" disabled={!tricky.length} onClick={onPractice}>
              Fight tricky words now
            </button>
          </div>
        </section>

        <section className="panel sticker word-list-panel">
          <div className="list-tools">
            <input id="word-search" className="input" placeholder="Search in English or Turkish" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="filter-row">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className={`filter ${filter === f.id ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <ul className="word-list">
            {shown.map((w) => {
              const s = statusOf(profile.cards[w.id])
              const topic = topicById(w.topic)
              const hidden = s === 'new'
              return (
                <li key={w.id} className="word-row">
                  <span className="word-row-topic" style={{ '--topic': topic.color }} title={topic.name} aria-hidden="true">
                    {topic.icon}
                  </span>
                  <span className="word-row-text">
                    <strong>{hidden && w.topic !== CUSTOM_TOPIC.id ? '???' : w.en}</strong>
                    <span className="muted">{hidden && w.topic !== CUSTOM_TOPIC.id ? 'Discover it on the island' : w.tr}</span>
                  </span>
                  <span className={`pill pill-${s}`}>{STATUS_LABEL[s]}</span>
                  <span className="word-row-actions">
                    {(!hidden || w.topic === CUSTOM_TOPIC.id) && <SpeakerButton text={w.en} />}
                    {s !== 'new' && s !== 'tricky' && (
                      <button
                        type="button"
                        className="btn btn-small btn-ghost"
                        onClick={() => {
                          actions.focus(w.id)
                          play('tap')
                        }}
                      >
                        Practice
                      </button>
                    )}
                    {w.topic === CUSTOM_TOPIC.id &&
                      (confirmId === w.id ? (
                        <>
                          <button type="button" className="btn btn-small btn-danger" onClick={() => onRemove(w.id)}>
                            Delete
                          </button>
                          <button type="button" className="btn btn-small btn-ghost" onClick={() => setConfirmId(null)}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <button type="button" className="icon-btn icon-btn-sm" aria-label={`Delete ${w.en}`} onClick={() => setConfirmId(w.id)}>
                          🗑️
                        </button>
                      ))}
                  </span>
                </li>
              )
            })}
            {!shown.length && <li className="muted empty-row">No words match this filter.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
