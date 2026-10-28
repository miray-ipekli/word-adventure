import { useEffect, useMemo, useRef, useState } from 'react'
import { islandContent, topicById } from '../data/topics.js'
import { activeWords } from '../lib/srs.js'
import { caps, speak, speakLines } from '../lib/speech.js'
import { play } from '../lib/sound.js'
import { SentenceBuilder, SpeakerButton } from './Questions.jsx'

// Highlights the island's words and phrases inside a line of the story.
function Highlighted({ text, terms }) {
  const parts = useMemo(() => {
    if (!terms.length) return [text]
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length)
    return text.split(new RegExp(`\\b(${escaped.join('|')})\\b`, 'i'))
  }, [text, terms])
  const set = new Set(terms.map((t) => t.toLowerCase()))
  return parts.map((p, i) => (set.has(p.toLowerCase()) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))
}

// "Waiter: Hello!" is shown with the speaker's name, but only the words are read aloud.
const spoken = (line) => line.replace(/^[A-Z][\w ]{0,20}:\s*/, '')

export default function StoryTower({ profile, topicId, actions, onDone, onExit }) {
  const { story } = islandContent(topicId, profile.level)
  const terms = useMemo(() => activeWords(profile, topicId).map((w) => w.en), [profile, topicId])
  const [phase, setPhase] = useState('read') // read | quiz | build | done
  const [reading, setReading] = useState(-1)
  const stopRef = useRef(null)
  const [q, setQ] = useState(0)
  const [picked, setPicked] = useState(null)
  const [b, setB] = useState(0)
  const [built, setBuilt] = useState(null)
  const [score, setScore] = useState({ quiz: 0, build: 0 })

  useEffect(() => () => stopRef.current?.(), [])

  const listenAll = () => {
    if (reading >= 0) return stopRef.current?.()
    stopRef.current = speakLines(story.lines.map(spoken), { onLine: setReading, onEnd: () => setReading(-1) })
  }

  const answer = (i) => {
    if (picked !== null) return
    const ok = i === story.questions[q][2]
    play(ok ? 'correct' : 'wrong')
    setPicked(i)
    if (ok) setScore((s) => ({ ...s, quiz: s.quiz + 1 }))
  }

  const nextQuestion = () => {
    setPicked(null)
    if (q + 1 < story.questions.length) setQ(q + 1)
    else setPhase('build')
  }

  const nextBuild = () => {
    setBuilt(null)
    if (b + 1 < story.build.length) return setB(b + 1)
    const xp = 20 + score.quiz * 5 + score.build * 5
    actions.xp(xp)
    play('fanfare')
    onDone()
    setPhase('done')
  }

  return (
    <div className="screen session-screen">
      <header className="session-top">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Back to the island">
          ✕
        </button>
        <h1 className="session-title">
          📖 {topicById(topicId).name} · Story Tower
        </h1>
      </header>

      <main className="session-stage">
        {phase === 'read' && (
          <div className="panel sticker story">
            <span className="q-kicker">Read and listen</span>
            <h2 className="title-lg">{story.title}</h2>
            {caps.tts && (
              <button type="button" className="btn" onClick={listenAll}>
                {reading >= 0 ? '⏹ Stop' : '▶ Listen to the story'}
              </button>
            )}
            <div className="story-lines">
              {story.lines.map((line, i) => (
                <p key={i} className={`story-line ${reading === i ? 'is-reading' : ''}`}>
                  <button type="button" className="line-play" onClick={() => speak(spoken(line))} aria-label="Listen to this line">
                    🔊
                  </button>
                  <span>
                    <Highlighted text={line} terms={terms} />
                  </span>
                </p>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                stopRef.current?.()
                setPhase('quiz')
              }}
            >
              I read it · Questions
            </button>
          </div>
        )}

        {phase === 'quiz' && (
          <div className="panel sticker q-panel">
            <div className="q-card">
              <span className="q-kicker">
                Question {q + 1} of {story.questions.length}
              </span>
              <h2 className="title-md">{story.questions[q][0]}</h2>
              <div className="options options-1">
                {story.questions[q][1].map((opt, i) => {
                  const state = picked === null ? '' : i === story.questions[q][2] ? 'is-right' : i === picked ? 'is-wrong' : 'is-dim'
                  return (
                    <button key={i} type="button" className={`option ${state}`} disabled={picked !== null} onClick={() => answer(i)}>
                      <span className="option-key">{i + 1}</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {picked !== null && (
                <button type="button" className="btn btn-primary" onClick={nextQuestion} autoFocus>
                  Continue
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'build' && (
          <div className="panel sticker q-panel" key={b}>
            <div className="q-card">
              <span className="q-kicker">
                Build a sentence from the story · {b + 1} of {story.build.length}
              </span>
              <SentenceBuilder
                sentence={story.build[b]}
                locked={built !== null}
                onResult={(ok) => {
                  play(ok ? 'correct' : 'wrong')
                  setBuilt(ok)
                  if (ok) setScore((s) => ({ ...s, build: s.build + 1 }))
                }}
              />
              {built !== null && (
                <>
                  <p className={built ? 'success-note' : 'error-note'}>
                    {built ? 'Perfect sentence!' : 'Almost. The sentence is:'} <strong>{story.build[b]}</strong>{' '}
                    <SpeakerButton text={story.build[b]} />
                  </p>
                  <button type="button" className="btn btn-primary" onClick={nextBuild} autoFocus>
                    Continue
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="panel sticker end-card">
            <div className="big-icon" aria-hidden="true">
              📜
            </div>
            <h2 className="title-lg">Story complete!</h2>
            <div className="stat-row">
              <div className="stat stat-learning">
                <strong className="tabular">
                  {score.quiz}/{story.questions.length}
                </strong>
                <span>Questions</span>
              </div>
              <div className="stat stat-mastered">
                <strong className="tabular">
                  {score.build}/{story.build.length}
                </strong>
                <span>Sentences</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={onExit} autoFocus>
              Back to the island
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
