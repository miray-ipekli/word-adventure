import { useEffect, useState } from 'react'
import { islandContent, topicById } from '../data/topics.js'
import { caps, listen, matchSentence, MIC_ERRORS, speakThen } from '../lib/speech.js'
import { play } from '../lib/sound.js'
import { SentenceBuilder, SpeakerButton } from './Questions.jsx'

const PASS = 70
const MAX_TRIES = 3

// The Castle scene: the other character speaks, you answer each line out loud.
// Without a microphone, your lines are built from word tiles instead.
export default function RolePlay({ profile, topicId, actions, onDone, onExit }) {
  const { roleplay } = islandContent(topicId, profile.level)
  const voice = caps.mic && profile.micOn !== false
  const [at, setAt] = useState(0)
  const [state, setState] = useState('idle') // idle | listening | result
  const [result, setResult] = useState(null)
  const [tries, setTries] = useState(0)
  const [error, setError] = useState('')
  const [built, setBuilt] = useState(null)
  const [log, setLog] = useState([])

  const line = roleplay.lines[at]
  const finished = at >= roleplay.lines.length
  const yourTurn = line?.[0] === 'you'

  // The other character's lines are read aloud, then the scene moves on.
  useEffect(() => {
    if (!line || yourTurn) return
    let cancelled = false
    speakThen(line[1], () =>
      setTimeout(() => {
        if (cancelled) return
        setLog((l) => [...l, line])
        setAt((a) => a + 1)
      }, 400),
    )
    return () => {
      cancelled = true
    }
  }, [at])

  useEffect(() => {
    if (!finished) return
    actions.xp(15 * roleplay.lines.filter((l) => l[0] === 'you').length)
    play('fanfare')
    onDone()
    // Runs once, when the scene ends.
  }, [finished])

  const moveOn = () => {
    setLog((l) => [...l, line])
    setResult(null)
    setTries(0)
    setBuilt(null)
    setState('idle')
    setError('')
    setAt((a) => a + 1)
  }

  const record = async () => {
    setError('')
    try {
      const alts = await listen({ onStart: () => setState('listening') })
      const r = matchSentence(alts, line[1])
      setResult(r)
      setTries((t) => t + 1)
      setState('result')
      play(r.score >= PASS ? 'correct' : 'wrong')
    } catch (e) {
      setState('idle')
      setError(MIC_ERRORS[e.message] ?? 'Something went wrong with the microphone.')
    }
  }

  return (
    <div className="screen session-screen">
      <header className="session-top">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Back to the island">
          ✕
        </button>
        <h1 className="session-title">🏰 {roleplay.title}</h1>
      </header>

      <main className="session-stage">
        <p className="scene-note">{roleplay.scene}</p>

        <div className="chat">
          {log.map((l, i) => (
            <p key={i} className={`bubble bubble-${l[0]}`}>
              {l[1]}
            </p>
          ))}
          {line && !yourTurn && <p className="bubble bubble-npc is-speaking">{line[1]}</p>}
        </div>

        {line && yourTurn && (
          <div className="panel sticker q-panel">
            <div className="q-card">
              <span className="q-kicker">Your turn{voice ? ': say this line' : ': build your line'}</span>
              {voice ? (
                <>
                  <p className="studio-sentence">
                    {line[1].split(/\s+/).map((w, i) => (
                      <span key={i} className={result ? (result.hits[i] ? 'hit' : 'miss') : ''}>
                        {w}{' '}
                      </span>
                    ))}
                  </p>
                  <p className="muted">{line[2]}</p>
                  <div className="listen-prompt">
                    <SpeakerButton text={line[1]} label="Listen first" />
                    <SpeakerButton text={line[1]} slow label="Listen first" />
                  </div>
                  <button
                    type="button"
                    className={`mic ${state === 'listening' ? 'is-listening' : ''}`}
                    onClick={record}
                    disabled={state === 'listening'}
                    aria-label="Tap and say your line"
                  >
                    <span aria-hidden="true">🎙️</span>
                  </button>
                  <p className="mic-status" aria-live="polite">
                    {state === 'listening' && 'Listening… say your line'}
                    {state === 'idle' && !error && 'Tap the microphone and say your line'}
                    {state === 'result' && result && (result.score >= PASS ? `${result.score}% · well said!` : `${result.score}% · the red words need another try`)}
                  </p>
                  {error && <p className="error-note">{error}</p>}
                  <div className="form-actions">
                    {state === 'result' && result.score < PASS && tries >= MAX_TRIES ? (
                      <button type="button" className="btn btn-ghost" onClick={moveOn}>
                        Continue anyway
                      </button>
                    ) : (
                      <span />
                    )}
                    {state === 'result' && result.score >= PASS && (
                      <button type="button" className="btn btn-primary" onClick={moveOn} autoFocus>
                        Continue
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="muted">{line[2]}</p>
                  <SentenceBuilder key={at} sentence={line[1]} locked={built !== null} onResult={(ok) => (play(ok ? 'correct' : 'wrong'), setBuilt(ok))} />
                  {built !== null && (
                    <>
                      <p className={built ? 'success-note' : 'error-note'}>
                        {built ? 'Well said!' : 'Almost. Your line is:'} <strong>{line[1]}</strong> <SpeakerButton text={line[1]} />
                      </p>
                      <button type="button" className="btn btn-primary" onClick={moveOn} autoFocus>
                        Continue
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {finished && (
          <div className="panel sticker end-card">
            <div className="big-icon" aria-hidden="true">
              🎭
            </div>
            <h2 className="title-lg">Scene complete!</h2>
            <p className="muted">
              {topicById(topicId).name}: the final exam is now open. You need {profile.level === 'beginner' ? 70 : 85}% to conquer the
              island.
            </p>
            <button type="button" className="btn btn-primary" onClick={onExit} autoFocus>
              Back to the island
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
