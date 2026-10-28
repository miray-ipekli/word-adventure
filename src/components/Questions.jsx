import { useEffect, useMemo, useRef, useState } from 'react'
import { checkTyped, distractors, gapSentence, QUESTION_LABEL } from '../lib/srs.js'
import { caps, listen, matchWord, MIC_ERRORS, speak } from '../lib/speech.js'
import { play } from '../lib/sound.js'

export function SpeakerButton({ text, slow, big, label = 'Listen' }) {
  if (!caps.tts) return null
  return (
    <button
      type="button"
      className={`speaker ${big ? 'speaker-big' : ''}`}
      aria-label={slow ? `${label} slowly` : label}
      onClick={() => speak(text, { slow })}
    >
      <span aria-hidden="true">{slow ? '🐢' : '🔊'}</span>
    </button>
  )
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5)
}

// Shows the example sentence with the target word highlighted.
export function Example({ word }) {
  if (!word.ex) return null
  const escaped = word.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = word.ex.split(new RegExp(`(\\b${escaped}\\b)`, 'i'))
  return (
    <p className="example">
      {parts.map((p, i) =>
        p.toLowerCase() === word.en.toLowerCase() ? (
          <mark key={i}>{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  )
}

export function Discover({ word, onDone }) {
  useEffect(() => {
    play('discover')
    speak(word.en)
  }, [word])
  return (
    <div className="q-card discover">
      <span className="q-kicker">New word discovered!</span>
      <div className="discover-word">
        <h2 className="word-xl">{word.en}</h2>
        <SpeakerButton text={word.en} />
        <SpeakerButton text={word.en} slow />
      </div>
      <p className="discover-tr">{word.tr}</p>
      {word.ex && (
        <div className="discover-ex">
          <Example word={word} />
          <SpeakerButton text={word.ex} label="Listen to the sentence" />
        </div>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onDone(true)}>
          I already know it
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onDone(false)} autoFocus>
          Got it!
        </button>
      </div>
    </div>
  )
}

export function Question({ word, type: asked, profile, locked, onResult, onSwitchType }) {
  // Own words may have no usable example sentence; then the gap question becomes a word choice.
  const type = asked === 'gap' && !gapSentence(word) ? 'reverse' : asked
  const label = QUESTION_LABEL[type]
  return (
    <div className="q-card">
      <span className="q-kicker">{label}</span>
      {['meaning', 'reverse', 'listen', 'gap'].includes(type) && (
        <ChoiceQuestion word={word} type={type} profile={profile} locked={locked} onResult={onResult} />
      )}
      {type === 'build' && <BuildQuestion word={word} locked={locked} onResult={onResult} />}
      {type === 'type' && <TypeQuestion word={word} locked={locked} onResult={onResult} />}
      {type === 'speak' && <SpeakQuestion word={word} locked={locked} onResult={onResult} onSkip={() => onSwitchType('type')} />}
    </div>
  )
}

function ChoiceQuestion({ word, type, profile, locked, onResult }) {
  const field = type === 'meaning' ? 'tr' : 'en'
  const options = useMemo(
    () => shuffle([word, ...distractors(word, profile, field)]),
    // Options are fixed for this question; profile changes after answering must not reshuffle them.
    [word.id, type],
  )
  const [picked, setPicked] = useState(null)
  const gap = type === 'gap' ? gapSentence(word) : null

  useEffect(() => {
    if (type === 'listen') setTimeout(() => speak(word.en), 250)
  }, [type, word])

  const choose = (opt) => {
    if (picked || locked) return
    setPicked(opt.id)
    onResult(opt.id === word.id)
  }

  useEffect(() => {
    const onKey = (e) => {
      const n = Number(e.key)
      if (n >= 1 && n <= options.length && !e.target.closest?.('input')) choose(options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <div className="q-prompt">
        {type === 'meaning' && (
          <div className="discover-word">
            <h2 className="word-xl">{word.en}</h2>
            <SpeakerButton text={word.en} />
          </div>
        )}
        {type === 'reverse' && <h2 className="word-xl word-tr">{word.tr}</h2>}
        {type === 'listen' && (
          <div className="listen-prompt">
            <SpeakerButton text={word.en} big />
            <SpeakerButton text={word.en} slow />
          </div>
        )}
        {type === 'gap' && (
          <>
            <p className="gap-sentence">{gap ?? word.ex}</p>
            <p className="muted">Hint: {word.tr}</p>
          </>
        )}
      </div>
      <div className="options">
        {options.map((opt, i) => {
          const state = !picked ? '' : opt.id === word.id ? 'is-right' : opt.id === picked ? 'is-wrong' : 'is-dim'
          return (
            <button key={opt.id} type="button" className={`option ${state}`} onClick={() => choose(opt)} disabled={!!picked}>
              <span className="option-key">{i + 1}</span>
              {opt[field]}
            </button>
          )
        })}
      </div>
    </>
  )
}

function BuildQuestion({ word, locked, onResult }) {
  const target = word.en.toLowerCase()
  const letters = useMemo(
    () =>
      shuffle(
        [...target].map((ch, i) => ({ ch, i })).filter((x) => /[a-z']/.test(x.ch)),
      ),
    [target],
  )
  const slots = [...target].map((ch, i) => ({ ch, i, fixed: !/[a-z']/.test(ch) }))
  const fillable = slots.filter((s) => !s.fixed)
  const [placed, setPlaced] = useState([])
  const [done, setDone] = useState(false)

  const add = (tile) => {
    if (done || locked) return
    play('tap')
    const next = [...placed, tile]
    setPlaced(next)
    if (next.length === fillable.length) {
      const answer = next.map((t) => t.ch).join('')
      const expected = fillable.map((s) => s.ch).join('')
      setDone(true)
      onResult(answer === expected)
    }
  }
  const remove = (k) => !done && setPlaced(placed.filter((_, i) => i !== k))

  let cursor = 0
  return (
    <>
      <div className="q-prompt">
        <h2 className="word-xl word-tr">{word.tr}</h2>
        <SpeakerButton text={word.en} />
      </div>
      <div className="build-slots" aria-label="Your answer">
        {slots.map((s) => {
          if (s.fixed) return <span key={s.i} className="build-gap" />
          const k = cursor++
          const tile = placed[k]
          return (
            <button key={s.i} type="button" className={`build-slot ${tile ? 'is-filled' : ''}`} onClick={() => tile && remove(k)}>
              {tile?.ch ?? ''}
            </button>
          )
        })}
      </div>
      <div className="build-tiles">
        {letters.map((t) => {
          const used = placed.some((p) => p.i === t.i)
          return (
            <button key={t.i} type="button" className="tile" disabled={used || done} onClick={() => add(t)}>
              {t.ch}
            </button>
          )
        })}
      </div>
    </>
  )
}

function TypeQuestion({ word, locked, onResult }) {
  const [value, setValue] = useState('')
  const [hint, setHint] = useState(false)
  const [done, setDone] = useState(false)
  const input = useRef(null)
  useEffect(() => input.current?.focus(), [])

  const submit = (e) => {
    e.preventDefault()
    if (done || locked || !value.trim()) return
    const r = checkTyped(value, word.en)
    setDone(true)
    onResult(r.correct, r.correct && !r.exact ? `Almost perfect! It's spelled "${word.en}".` : null)
  }

  return (
    <form onSubmit={submit} className="type-form">
      <div className="q-prompt">
        <h2 className="word-xl word-tr">{word.tr}</h2>
        {hint && <p className="muted">Starts with “{word.en.slice(0, 2)}…” · {word.en.length} letters</p>}
      </div>
      <input
        ref={input}
        id="type-answer"
        className="input input-xl"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
        placeholder="Type the English word"
        value={value}
        disabled={done}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" disabled={hint || done} onClick={() => setHint(true)}>
          Show a hint
        </button>
        <button type="submit" className="btn btn-primary" disabled={!value.trim() || done}>
          Check
        </button>
      </div>
    </form>
  )
}

function SpeakQuestion({ word, locked, onResult, onSkip }) {
  const [state, setState] = useState('idle') // idle | listening | retry | done
  const [heard, setHeard] = useState('')
  const [error, setError] = useState('')
  const tries = useRef(0)

  const record = async () => {
    if (locked || state === 'listening' || state === 'done') return
    setError('')
    try {
      const alts = await listen({ onStart: () => setState('listening') })
      const r = matchWord(alts, word.en)
      setHeard(r.heard)
      tries.current += 1
      if (r.correct) {
        setState('done')
        onResult(true, null, 'speak')
      } else if (tries.current < 2) {
        setState('retry')
        play('wrong')
      } else {
        setState('done')
        onResult(false, r.heard ? `I heard “${r.heard}”.` : null)
      }
    } catch (e) {
      setState('idle')
      setError(MIC_ERRORS[e.message] ?? 'Something went wrong with the microphone.')
    }
  }

  return (
    <>
      <div className="q-prompt">
        <div className="discover-word">
          <h2 className="word-xl">{word.en}</h2>
          <SpeakerButton text={word.en} />
          <SpeakerButton text={word.en} slow />
        </div>
        <p className="muted">{word.tr}</p>
      </div>
      <button
        type="button"
        className={`mic ${state === 'listening' ? 'is-listening' : ''}`}
        onClick={record}
        disabled={state === 'done'}
        aria-label="Tap and say the word"
      >
        <span aria-hidden="true">🎙️</span>
      </button>
      <p className="mic-status" aria-live="polite">
        {state === 'listening' && 'Listening… say the word now'}
        {state === 'idle' && !error && 'Tap the microphone and say the word'}
        {state === 'retry' && `I heard “${heard || '…'}”. One more try!`}
      </p>
      {error && <p className="error-note">{error}</p>}
      {state !== 'done' && (
        <button type="button" className="btn btn-ghost btn-small" onClick={onSkip}>
          I can't speak right now, let me type
        </button>
      )}
    </>
  )
}
