import { useState } from 'react'
import { AVATARS, AVATAR_COLORS } from '../lib/storage.js'
import { PICK_COUNT } from '../data/topics.js'
import { play } from '../lib/sound.js'
import { Avatar, AvatarPicker, LevelPicker, TopicPicker } from './Pickers.jsx'

const STEPS = ['Explorer', 'Level', 'Islands']

export default function Onboarding({ canCancel, onCancel, onDone }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    color: AVATAR_COLORS[0],
    level: null,
    topics: [],
  })

  const valid = [form.name.trim().length > 0, !!form.level, form.topics.length === PICK_COUNT][step]

  const next = () => {
    if (!valid) return
    if (step < STEPS.length - 1) {
      play('tap')
      setStep(step + 1)
    } else {
      play('fanfare')
      onDone({ ...form, name: form.name.trim() })
    }
  }

  return (
    <div className="screen sea-screen">
      <form
        className="panel onboarding sticker"
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
      >
        <ol className="stepper" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'is-now' : i < step ? 'is-done' : ''}>
              <span className="stepper-dot">{i < step ? '✓' : i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section className="step">
            <div className="step-head">
              <Avatar avatar={form.avatar} color={form.color} size={84} />
              <div>
                <h2 className="title-lg">Who is the explorer?</h2>
                <p className="muted">Each explorer has their own level, islands and progress.</p>
              </div>
            </div>
            <label className="field">
              <span className="field-label">Name</span>
              <input
                id="explorer-name"
                className="input"
                autoFocus
                maxLength={20}
                placeholder="e.g. Miray"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <span className="field-label">Avatar</span>
            <AvatarPicker avatar={form.avatar} color={form.color} onChange={(v) => setForm({ ...form, ...v })} />
          </section>
        )}

        {step === 1 && (
          <section className="step">
            <h2 className="title-lg">How much English do you know?</h2>
            <p className="muted">You can change this later in Settings.</p>
            <LevelPicker value={form.level} onChange={(level) => setForm({ ...form, level })} />
          </section>
        )}

        {step === 2 && (
          <section className="step">
            <h2 className="title-lg">Choose your 5 islands</h2>
            <p className="muted">Your map is built from these topics, in the order you pick them.</p>
            <TopicPicker value={form.topics} onChange={(topics) => setForm({ ...form, topics })} />
          </section>
        )}

        <div className="form-actions">
          {step > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : canCancel ? (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {step === STEPS.length - 1 ? 'Set sail!' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  )
}
