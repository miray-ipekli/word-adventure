import { useMemo, useState } from 'react'
import { CUSTOM_TOPIC, topicById } from '../data/topics.js'
import { activeWords } from '../lib/srs.js'
import { caps, listen, matchSentence, MIC_ERRORS } from '../lib/speech.js'
import { play } from '../lib/sound.js'
import { SpeakerButton } from './Questions.jsx'

function starsFor(score) {
  if (score >= 90) return 3
  if (score >= 70) return 2
  if (score >= 40) return 1
  return 0
}

export default function SpeakStudio({ profile, actions, onExit }) {
  const topics = [...profile.topics, ...(profile.custom.length ? [CUSTOM_TOPIC.id] : [])]
  const [topicId, setTopicId] = useState('all')
  const [pos, setPos] = useState(0)
  const [state, setState] = useState('idle') // idle | listening | result
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [earned, setEarned] = useState(0)

  // Sentences from discovered words come first, so practice follows what you are learning.
  const sentences = useMemo(() => {
    const words = (topicId === 'all' ? topics.flatMap((t) => activeWords(profile, t)) : activeWords(profile, topicId)).filter(
      (w) => w.ex,
    )
    const seen = words.filter((w) => profile.cards[w.id])
    const unseen = words.filter((w) => !profile.cards[w.id])
    return [...seen.sort(() => Math.random() - 0.5), ...unseen]
    // Only reshuffle when the topic filter changes.
  }, [topicId])

  const word = sentences[pos % Math.max(1, sentences.length)]

  const record = async () => {
    setError('')
    try {
      const alts = await listen({ onStart: () => setState('listening') })
      const r = matchSentence(alts, word.ex)
      setResult(r)
      setState('result')
      const stars = starsFor(r.score)
      play(stars >= 2 ? 'correct' : 'wrong')
      if (stars >= 2) {
        actions.xp(15)
        setEarned((e) => e + 15)
      }
    } catch (e) {
      setState('idle')
      setError(MIC_ERRORS[e.message] ?? 'Something went wrong with the microphone.')
    }
  }

  const nextSentence = () => {
    setPos((p) => p + 1)
    setResult(null)
    setState('idle')
    setError('')
  }

  const pickTopic = (id) => {
    setTopicId(id)
    setPos(0)
    setResult(null)
    setState('idle')
  }

  return (
    <div className="screen session-screen">
      <header className="session-top">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Back to the map">
          ✕
        </button>
        <h1 className="session-title">Speak Studio</h1>
        <span className="combo">+{earned} XP</span>
      </header>

      <main className="session-stage studio">
        <div className="filter-row" role="tablist" aria-label="Topic">
          <button type="button" role="tab" aria-selected={topicId === 'all'} className={`filter ${topicId === 'all' ? 'is-on' : ''}`} onClick={() => pickTopic('all')}>
            All islands
          </button>
          {topics.map((id) => {
            const t = topicById(id)
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={topicId === id}
                className={`filter ${topicId === id ? 'is-on' : ''}`}
                style={{ '--topic': t.color }}
                onClick={() => pickTopic(id)}
              >
                <span aria-hidden="true">{t.icon}</span> {t.name}
              </button>
            )
          })}
        </div>

        {word ? (
          <div className="panel sticker q-panel">
            <div className="q-card">
              <span className="q-kicker">Listen, then say the whole sentence</span>
              <p className="studio-sentence">
                {word.ex.split(/\s+/).map((w, i) => (
                  <span
                    key={i}
                    className={result ? (result.hits[i] ? 'hit' : 'miss') : ''}
                  >
                    {w}{' '}
                  </span>
                ))}
              </p>
              <p className="muted">
                Key word: <strong>{word.en}</strong> · {word.tr}
              </p>
              <div className="listen-prompt">
                <SpeakerButton text={word.ex} big label="Listen to the sentence" />
                <SpeakerButton text={word.ex} slow label="Listen to the sentence" />
              </div>

              {caps.mic ? (
                <>
                  <button
                    type="button"
                    className={`mic ${state === 'listening' ? 'is-listening' : ''}`}
                    onClick={record}
                    disabled={state === 'listening'}
                    aria-label="Tap and say the sentence"
                  >
                    <span aria-hidden="true">🎙️</span>
                  </button>
                  <p className="mic-status" aria-live="polite">
                    {state === 'listening' && 'Listening… read the sentence out loud'}
                    {state === 'idle' && !error && 'Tap the microphone and read the sentence'}
                    {state === 'result' && result && (
                      <>
                        <span className="stars" aria-label={`${starsFor(result.score)} of 3 stars`}>
                          {'★'.repeat(starsFor(result.score))}
                          <span className="dim">{'★'.repeat(3 - starsFor(result.score))}</span>
                        </span>{' '}
                        {result.score}% matched{result.heard ? ` · I heard “${result.heard}”` : ''}
                      </>
                    )}
                  </p>
                  {error && <p className="error-note">{error}</p>}
                </>
              ) : (
                <p className="error-note">
                  This browser cannot listen to your voice. You can still listen and repeat out loud. For scoring, open the game in Chrome or Edge.
                </p>
              )}

              <div className="form-actions">
                {state === 'result' ? (
                  <button type="button" className="btn btn-ghost" onClick={record}>
                    Try again
                  </button>
                ) : (
                  <span />
                )}
                <button type="button" className="btn btn-primary" onClick={nextSentence}>
                  Next sentence
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel sticker end-card">
            <p>No sentences here yet. Explore an island first.</p>
          </div>
        )}
      </main>
    </div>
  )
}
