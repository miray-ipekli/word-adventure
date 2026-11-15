import { useState } from 'react'
import { AVATARS, AVATAR_COLORS } from '../lib/storage.js'
import { PICK_COUNT } from '../data/topics.js'
import { play } from '../lib/sound.js'
import { defaultLangForLevel, LangRoot, useT } from '../lib/i18n.js'
import { Avatar, AvatarPicker, LangPicker, LangSwitch, LevelPicker, TopicPicker } from './Pickers.jsx'
import { NewPin } from './PinPad.jsx'

const STEPS = ['Explorer', 'Level', 'Islands', 'PIN']

// `lang` is this device's language. Once a level is picked, the new explorer's own language
// (Turkish for Beginner, English otherwise, changeable) takes over for the rest of the steps.
export default function Onboarding({ canCancel, lang, busy, error, onCancel, onDone }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    color: AVATAR_COLORS[0],
    level: null,
    lang: null,
    topics: [],
  })
  // Picking a level suggests a language until the explorer chooses one themselves.
  const [langChosen, setLangChosen] = useState(false)
  const uiLang = form.lang ?? lang

  return (
    <LangRoot lang={uiLang}>
      <OnboardingSteps
        {...{ canCancel, busy, error, onCancel, onDone, step, setStep, form, setForm }}
        lang={uiLang}
        onLevel={(level) => setForm({ ...form, level, lang: langChosen ? form.lang : defaultLangForLevel(level) })}
        onLang={(l) => {
          setLangChosen(true)
          setForm({ ...form, lang: l })
        }}
      />
    </LangRoot>
  )
}

function OnboardingSteps({ canCancel, busy, error, onCancel, onDone, step, setStep, form, setForm, lang, onLevel, onLang }) {
  const t = useT()
  const valid = [form.name.trim().length > 0, !!form.level, form.topics.length === PICK_COUNT, false][step]

  const next = () => {
    if (!valid) return
    play('tap')
    setStep(step + 1)
  }

  return (
    <div className="screen sea-screen">
      {step === 0 && (
        <div className="screen-corner">
          <LangSwitch value={lang} onChange={onLang} />
        </div>
      )}
      <form
        className="panel onboarding sticker"
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
      >
        <ol className="stepper" aria-label={t('Steps')}>
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'is-now' : i < step ? 'is-done' : ''}>
              <span className="stepper-dot">{i < step ? '✓' : i + 1}</span>
              <span>{t(s)}</span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section className="step">
            <div className="step-head">
              <Avatar avatar={form.avatar} color={form.color} size={84} />
              <div>
                <h2 className="title-lg">{t('Who is the explorer?')}</h2>
                <p className="muted">{t('Each explorer has their own level, islands and progress.')}</p>
              </div>
            </div>
            <label className="field">
              <span className="field-label">{t('Name')}</span>
              <input
                id="explorer-name"
                className="input"
                autoFocus
                maxLength={20}
                placeholder={t('e.g. Miray')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <span className="field-label">{t('Avatar')}</span>
            <AvatarPicker avatar={form.avatar} color={form.color} onChange={(v) => setForm({ ...form, ...v })} />
          </section>
        )}

        {step === 1 && (
          <section className="step">
            <h2 className="title-lg">{t('How much English do you know?')}</h2>
            <p className="muted">{t('You can change this later in Settings.')}</p>
            <LevelPicker value={form.level} onChange={onLevel} />
            {form.level && (
              <div className="field">
                <span className="field-label">{t('Menu language')}</span>
                <p className="muted">{t('Buttons and instructions in this language. The words you learn are always English.')}</p>
                <LangPicker value={lang} onChange={onLang} />
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="step">
            <h2 className="title-lg">{t('Choose your {n} islands', { n: PICK_COUNT })}</h2>
            <p className="muted">{t('Your map is built from these topics, in the order you pick them.')}</p>
            <TopicPicker value={form.topics} onChange={(topics) => setForm({ ...form, topics })} />
          </section>
        )}

        {step === 3 && (
          <section className="step step-pin">
            <h2 className="title-lg">{t('Pick a secret PIN')}</h2>
            <p className="muted">
              {t('You will type it each time you open the game on a new device. Choose something {name} can remember.', {
                name: form.name.trim() || t('you'),
              })}
            </p>
            <NewPin
              busy={busy}
              error={error}
              onDone={(pin) => {
                play('fanfare')
                onDone({ ...form, lang, name: form.name.trim(), pin })
              }}
            />
          </section>
        )}

        <div className="form-actions">
          {step > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              {t('Back')}
            </button>
          ) : canCancel ? (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              {t('Cancel')}
            </button>
          ) : (
            <span />
          )}
          {step < 3 && (
            <button type="submit" className="btn btn-primary" disabled={!valid}>
              {t('Next')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
