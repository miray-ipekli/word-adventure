import { useMemo, useState } from 'react'
import { CUSTOM_TOPIC, topicById } from '../data/topics.js'
import { activeWords, isStarred, statusOf, trickyWords } from '../lib/srs.js'
import { play } from '../lib/sound.js'
import { useT } from '../lib/i18n.js'
import { SpeakerButton, StarButton } from './Questions.jsx'

const FILTERS = [
  { id: 'all', name: 'All' },
  { id: 'starred', name: '★ Starred' },
  { id: 'tricky', name: 'Tricky' },
  { id: 'learning', name: 'Learning' },
  { id: 'mastered', name: 'Mastered' },
  { id: 'mine', name: 'My own' },
]
const STATUS_LABEL = { new: 'Not discovered', learning: 'Learning', tricky: 'Tricky', mastered: 'Mastered' }

export default function MyWords({ profile, actions, initialFilter = 'all', onAdd, onRemove, onPractice, onExit }) {
  const t = useT()
  const [form, setForm] = useState({ en: '', tr: '', ex: '' })
  const [filter, setFilter] = useState(initialFilter)
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [added, setAdded] = useState('')

  const words = useMemo(
    () => [...activeWords(profile, CUSTOM_TOPIC.id), ...profile.topics.flatMap((id) => activeWords(profile, id))],
    [profile],
  )
  const tricky = trickyWords(profile)
  const q = query.trim().toLowerCase()
  const shown = words.filter((w) => {
    const s = statusOf(profile.cards[w.id])
    if (filter === 'mine' && w.topic !== CUSTOM_TOPIC.id) return false
    if (filter === 'starred' && !isStarred(profile, w.id)) return false
    if (!['all', 'mine', 'starred'].includes(filter) && s !== filter) return false
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
      setAdded(t('“{word}” is already on your map.', { word: en }))
      return
    }
    onAdd({ id: `custom.${Date.now().toString(36)}`, en, tr, ex: form.ex.trim() })
    play('discover')
    setAdded(t('“{word}” was added to My Island. It will show up in your next adventure there.', { word: en }))
    setForm({ en: '', tr: '', ex: '' })
  }

  return (
    <div className="screen page-screen">
      <header className="page-top">
        <button type="button" className="icon-btn" onClick={onExit} aria-label={t('Back to the map')}>
          ←
        </button>
        <h1 className="title-lg">{t('My words')}</h1>
      </header>

      <div className="page-grid">
        <section className="panel sticker">
          <h2 className="title-md">{t('Add a word you heard')}</h2>
          <p className="muted">{t('From a series, a meeting or a song. It goes to My Island and follows the same review steps.')}</p>
          <form className="add-form" onSubmit={submit}>
            <label className="field">
              <span className="field-label">{t('English')}</span>
              <input id="add-en" className="input" value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} placeholder={t('e.g. brainstorm')} />
            </label>
            <label className="field">
              <span className="field-label">{t('Turkish')}</span>
              <input id="add-tr" className="input" value={form.tr} onChange={(e) => setForm({ ...form, tr: e.target.value })} placeholder={t('e.g. beyin fırtınası')} />
            </label>
            <label className="field">
              <span className="field-label">{t('Example sentence (optional)')}</span>
              <input
                id="add-ex"
                className="input"
                value={form.ex}
                onChange={(e) => setForm({ ...form, ex: e.target.value })}
                placeholder={t("e.g. Let's brainstorm some ideas.")}
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={!form.en.trim() || !form.tr.trim()}>
              {t('Add to My Island')}
            </button>
            {added && (
              <p className="success-note" role="status">
                {added}
              </p>
            )}
          </form>

          <div className="quest quest-boss inset">
            <h3>{t('Tricky words: {n}', { n: tricky.length })}</h3>
            <p className="muted">{t('Tap “Practice” on any word below to send it to the boss fight.')}</p>
            <button type="button" className="btn btn-boss" disabled={!tricky.length} onClick={onPractice}>
              {t('Fight tricky words now')}
            </button>
          </div>
        </section>

        <section className="panel sticker word-list-panel">
          <div className="list-tools">
            <input id="word-search" className="input" placeholder={t('Search in English or Turkish')} value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="filter-row">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className={`filter ${filter === f.id ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
                  {t(f.name)}
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
                  <span className="word-row-topic" style={{ '--topic': topic.color }} title={t(topic.name)} aria-hidden="true">
                    {topic.icon}
                  </span>
                  <span className="word-row-text">
                    <strong>{hidden && w.topic !== CUSTOM_TOPIC.id ? '???' : w.en}</strong>
                    <span className="muted">{hidden && w.topic !== CUSTOM_TOPIC.id ? t('Discover it on the island') : w.tr}</span>
                  </span>
                  <span className={`pill pill-${s}`}>{t(STATUS_LABEL[s])}</span>
                  <span className="word-row-actions">
                    {(!hidden || w.topic === CUSTOM_TOPIC.id) && (
                      <StarButton word={w} on={isStarred(profile, w.id)} onToggle={actions.star} />
                    )}
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
                        {t('Practice')}
                      </button>
                    )}
                    {w.topic === CUSTOM_TOPIC.id &&
                      (confirmId === w.id ? (
                        <>
                          <button type="button" className="btn btn-small btn-danger" onClick={() => onRemove(w.id)}>
                            {t('Delete')}
                          </button>
                          <button type="button" className="btn btn-small btn-ghost" onClick={() => setConfirmId(null)}>
                            {t('Keep')}
                          </button>
                        </>
                      ) : (
                        <button type="button" className="icon-btn icon-btn-sm" aria-label={t('Delete {word}', { word: w.en })} onClick={() => setConfirmId(w.id)}>
                          🗑️
                        </button>
                      ))}
                  </span>
                </li>
              )
            })}
            {!shown.length && <li className="muted empty-row">{t('No words match this filter.')}</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
