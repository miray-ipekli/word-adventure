import { useEffect, useMemo, useState } from 'react'
import { topicById } from '../data/topics.js'
import { wordIndex } from '../lib/srs.js'
import { passMark } from '../lib/islands.js'
import { play } from '../lib/sound.js'
import { Discover, Example, Question, SpeakerButton } from './Questions.jsx'
import Confetti from './Confetti.jsx'

const PRAISE = ['Great!', 'Nice one!', 'Excellent!', 'You got it!', 'Brilliant!', 'Perfect!']
const MAX_RETRIES = 2

// After a miss, the word comes back a few steps later with an easier question.
const EASIER = { speak: 'gap', type: 'gap', build: 'gap', order: 'gap', gap: 'reverse', listen: 'meaning', reverse: 'meaning', meaning: 'meaning' }

// mode 'exam' is the Castle's final exam: no second chances, a pass mark, and correct answers
// do not move words forward (only misses are recorded, so they come back as tricky words).
export default function Session({ profile, steps: initialSteps, mode, topicId, actions, onExamDone, onExit }) {
  const index = useMemo(() => wordIndex(profile), [profile])
  const [steps, setSteps] = useState(initialSteps)
  const [at, setAt] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [combo, setCombo] = useState(0)
  const [tally, setTally] = useState({ xp: 0, right: 0, wrong: 0, words: {} })
  const [retries, setRetries] = useState({})

  const step = steps[at]
  const word = step ? index.get(step.wordId) : null
  const finished = at >= steps.length
  const exam = mode === 'exam'
  const title = { island: topicById(topicId)?.name, exam: 'Castle exam', tricky: 'Tricky words' }[mode] ?? 'Daily review'
  const score = tally.right + tally.wrong ? tally.right / (tally.right + tally.wrong) : 0
  const passed = exam && score >= passMark(profile.level)

  useEffect(() => {
    if (!finished || !steps.length) return
    play(exam && !passed ? 'wrong' : 'fanfare')
    if (exam) onExamDone(passed)
    // Runs once, when the last step is answered.
  }, [finished])

  const next = () => {
    setFeedback(null)
    setAt((a) => a + 1)
  }

  const gain = (xp) => {
    actions.xp(xp)
    setTally((t) => ({ ...t, xp: t.xp + xp }))
  }

  const onDiscover = (known) => {
    actions.discover(word.id, known)
    gain(5)
    if (known) {
      // Remove the follow-up "meaning" quiz: a known word is checked tomorrow instead.
      setSteps((s) => s.filter((x, i) => i <= at || x.wordId !== word.id))
    }
    next()
  }

  const onResult = (correct, note, kind) => {
    if ((!step.practice && !step.exam) || !correct) actions.answer(word.id, correct)
    const newCombo = correct ? combo + 1 : 0
    setCombo(newCombo)
    setTally((t) => ({
      ...t,
      right: t.right + (correct ? 1 : 0),
      wrong: t.wrong + (correct ? 0 : 1),
      words: { ...t.words, [word.id]: t.words[word.id] === false ? false : correct },
    }))
    if (correct) {
      play('correct')
      gain((kind === 'speak' ? 15 : 10) + (newCombo >= 3 ? 5 : 0))
    } else {
      play('wrong')
      const used = retries[word.id] ?? 0
      if (!exam && used < MAX_RETRIES) {
        setRetries((r) => ({ ...r, [word.id]: used + 1 }))
        setSteps((s) => {
          const copy = [...s]
          copy.splice(Math.min(copy.length, at + 3), 0, { kind: 'quiz', wordId: word.id, type: EASIER[step.type], retry: true })
          return copy
        })
      }
    }
    setFeedback({
      correct,
      note,
      title: correct ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : 'Not quite',
    })
  }

  const switchType = (type) => setSteps((s) => s.map((x, i) => (i === at ? { ...x, type } : x)))

  if (!steps.length) {
    return (
      <div className="screen sea-screen">
        <div className="panel sticker end-card">
          <div className="big-icon" aria-hidden="true">
            🏝️
          </div>
          <h2 className="title-lg">Nothing to do here right now</h2>
          <p className="muted">Your words are resting. Come back when reviews are due, or practice speaking in the meantime.</p>
          <button type="button" className="btn btn-primary" onClick={onExit}>
            Back to the map
          </button>
        </div>
      </div>
    )
  }

  if (finished) {
    const total = tally.right + tally.wrong
    const accuracy = total ? Math.round((tally.right / total) * 100) : 100
    const missed = Object.entries(tally.words)
      .filter(([, ok]) => ok === false)
      .map(([id]) => index.get(id))
    return (
      <div className="screen sea-screen">
        {(!exam || passed) && <Confetti />}
        <div className="panel sticker end-card">
          <div className="big-icon" aria-hidden="true">
            {exam ? (passed ? '🏰' : '🛡️') : '🏆'}
          </div>
          <h2 className="title-lg">
            {!exam ? 'Adventure complete!' : passed ? `${topicById(topicId)?.name} is conquered!` : 'The castle held this time'}
          </h2>
          {exam && (
            <p className={passed ? 'success-note' : 'muted'}>
              {passed
                ? 'Your flag is on the island and the next island is open. You can always come back here.'
                : `You need ${Math.round(passMark(profile.level) * 100)}% to win. The words you missed are now tricky words. Practice them and try the castle again tomorrow.`}
            </p>
          )}
          <div className="stat-row">
            <div className="stat stat-xp">
              <strong className="tabular">+{tally.xp}</strong>
              <span>XP</span>
            </div>
            <div className="stat stat-mastered">
              <strong className="tabular">{accuracy}%</strong>
              <span>Accuracy</span>
            </div>
            <div className="stat stat-learning">
              <strong className="tabular">{Object.keys(tally.words).length}</strong>
              <span>Words</span>
            </div>
          </div>
          {missed.length > 0 && (
            <div className="missed">
              <p>
                <strong>These words will come back soon:</strong>
              </p>
              <ul className="word-chips">
                {missed.map((w) => (
                  <li key={w.id} className="word-chip is-tricky">
                    {w.en} <span className="chip-tr">· {w.tr}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={onExit} autoFocus>
            {exam || mode === 'island' ? 'Back to the island' : 'Back to the map'}
          </button>
        </div>
      </div>
    )
  }

  // Leaving the exam half way counts as an attempt, so it cannot be retried right away.
  const leave = () => {
    if (exam && at > 0) onExamDone(false)
    onExit()
  }

  const progress = (at / steps.length) * 100

  return (
    <div className="screen session-screen">
      <header className="session-top">
        <button type="button" className="icon-btn" onClick={leave} aria-label="Leave the adventure">
          ✕
        </button>
        <div className="session-progress" aria-label={`Step ${at + 1} of ${steps.length}`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className={`combo ${combo >= 3 ? 'is-hot' : ''}`} aria-live="polite">
          {combo >= 2 ? `${combo}× combo` : title}
        </span>
      </header>

      <main className="session-stage">
        <div className="panel sticker q-panel" key={`${at}-${step.type}`}>
          {step.retry && <span className="retry-tag">Second chance</span>}
          {step.practice && <span className="retry-tag">Practice</span>}
          {step.exam && <span className="retry-tag">Castle exam · {at + 1}/{steps.length}</span>}
          {step.kind === 'discover' ? (
            <Discover word={word} onDone={onDiscover} />
          ) : (
            <Question
              word={word}
              type={step.type}
              profile={profile}
              locked={!!feedback}
              onResult={onResult}
              onSwitchType={switchType}
            />
          )}
        </div>
      </main>

      {feedback && (
        <div className={`feedback ${feedback.correct ? 'is-right' : 'is-wrong'}`} role="status">
          <div className="feedback-inner">
            <div className="feedback-text">
              <strong className="feedback-title">{feedback.title}</strong>
              {feedback.note && <span>{feedback.note}</span>}
              <span className="feedback-word">
                <b>{word.en}</b> = {word.tr} <SpeakerButton text={word.en} />
              </span>
              <Example word={word} />
            </div>
            <button type="button" className="btn btn-light" onClick={next} autoFocus>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
