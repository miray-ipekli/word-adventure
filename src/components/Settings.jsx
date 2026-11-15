import { useState } from 'react'
import { PICK_COUNT } from '../data/topics.js'
import { caps } from '../lib/speech.js'
import { LangRoot, langOf, useT } from '../lib/i18n.js'
import { AvatarPicker, LangPicker, LevelPicker, TopicPicker } from './Pickers.jsx'
import { NewPin } from './PinPad.jsx'

const OFFLINE_MSG = "Couldn't reach the cloud. Check your internet connection and try again."

const GOALS = [
  { xp: 30, name: 'Relaxed' },
  { xp: 50, name: 'Steady' },
  { xp: 100, name: 'Serious' },
  { xp: 200, name: 'Intense' },
]

export default function Settings(props) {
  const [lang, setLang] = useState(langOf(props.profile))
  // The page switches language as soon as a new one is picked, before saving.
  return (
    <LangRoot lang={lang}>
      <SettingsPage {...props} lang={lang} onLang={setLang} />
    </LangRoot>
  )
}

function SettingsPage({ profile, lang, onLang, onSave, onChangePin, onDelete, onSignOut, onExit }) {
  const t = useT()
  const [form, setForm] = useState({
    name: profile.name,
    avatar: profile.avatar,
    color: profile.color,
    level: profile.level,
    topics: profile.topics,
    dailyGoal: profile.dailyGoal,
    micOn: profile.micOn !== false,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pinState, setPinState] = useState({ open: false, busy: false, error: '', done: false })
  const [deleteState, setDeleteState] = useState({ busy: false, error: '' })

  const savePin = async (pin) => {
    setPinState({ open: true, busy: true, error: '', done: false })
    try {
      await onChangePin(pin)
      setPinState({ open: false, busy: false, error: '', done: true })
    } catch {
      setPinState({ open: true, busy: false, error: OFFLINE_MSG, done: false })
    }
  }

  const remove = async () => {
    setDeleteState({ busy: true, error: '' })
    try {
      await onDelete()
    } catch {
      setDeleteState({ busy: false, error: OFFLINE_MSG })
    }
  }
  const valid = form.name.trim() && form.topics.length === PICK_COUNT

  return (
    <div className="screen page-screen">
      <header className="page-top">
        <button type="button" className="icon-btn" onClick={onExit} aria-label={t('Back to the map')}>
          ←
        </button>
        <h1 className="title-lg">
          {t('Settings')} · {profile.name}
        </h1>
        <button type="button" className="btn btn-small hud-signout" onClick={onSignOut}>
          <span aria-hidden="true">🚪</span> {t('Sign out')}
        </button>
      </header>

      <form
        className="settings"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave({ ...form, lang, name: form.name.trim() })
        }}
      >
        <section className="panel sticker">
          <h2 className="title-md">{t('Menu language')}</h2>
          <p className="muted">{t('Buttons and instructions in this language. The words you learn are always English.')}</p>
          <LangPicker value={lang} onChange={onLang} />
        </section>

        <section className="panel sticker">
          <h2 className="title-md">{t('Explorer')}</h2>
          <label className="field">
            <span className="field-label">{t('Name')}</span>
            <input id="settings-name" className="input" maxLength={20} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <AvatarPicker avatar={form.avatar} color={form.color} onChange={(v) => setForm({ ...form, ...v })} />
        </section>

        <section className="panel sticker">
          <h2 className="title-md">{t('Level')}</h2>
          <p className="muted">{t('Changing level keeps every word you have already learned. Old words still come back for review.')}</p>
          <LevelPicker value={form.level} onChange={(level) => setForm({ ...form, level })} />
        </section>

        <section className="panel sticker">
          <h2 className="title-md">{t('Islands')}</h2>
          <TopicPicker value={form.topics} onChange={(topics) => setForm({ ...form, topics })} />
        </section>

        <section className="panel sticker">
          <h2 className="title-md">{t('Daily goal')}</h2>
          <div className="filter-row">
            {GOALS.map((g) => (
              <button
                key={g.xp}
                type="button"
                className={`filter ${form.dailyGoal === g.xp ? 'is-on' : ''}`}
                onClick={() => setForm({ ...form, dailyGoal: g.xp })}
              >
                {t(g.name)} · {g.xp} XP
              </button>
            ))}
          </div>
          <label className="toggle">
            <input id="settings-mic" type="checkbox" checked={form.micOn} disabled={!caps.mic} onChange={(e) => setForm({ ...form, micOn: e.target.checked })} />
            <span>
              {t('Speaking questions in adventures')}
              {!caps.mic && <span className="muted"> {t('(not supported in this browser, try Chrome or Edge)')}</span>}
            </span>
          </label>
        </section>

        <section className="panel sticker">
          <h2 className="title-md">PIN</h2>
          <p className="muted">{t('The PIN opens {name} on any device. Nobody can recover it, so pick one you will remember.', { name: profile.name })}</p>
          {pinState.open ? (
            <>
              <NewPin busy={pinState.busy} error={pinState.error} onDone={savePin} />
              <button type="button" className="btn btn-ghost" onClick={() => setPinState({ open: false, busy: false, error: '', done: false })}>
                {t('Cancel')}
              </button>
            </>
          ) : (
            <div className="form-actions">
              {pinState.done ? (
                <p className="success-note" role="status">
                  {t('PIN changed. Use the new PIN next time.')}
                </p>
              ) : (
                <span />
              )}
              <button type="button" className="btn" onClick={() => setPinState({ open: true, busy: false, error: '', done: false })}>
                {t('Change PIN')}
              </button>
            </div>
          )}
        </section>

        {deleteState.error && <p className="error-note">{t(deleteState.error)}</p>}

        <div className="settings-actions">
          {confirmDelete ? (
            <span className="danger-confirm">
              {t('Delete {name} and all progress on every device?', { name: profile.name })}
              <button type="button" className="btn btn-danger btn-small" onClick={remove} disabled={deleteState.busy}>
                {deleteState.busy ? t('Deleting…') : t('Yes, delete')}
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmDelete(false)}>
                {t('No')}
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => setConfirmDelete(true)}>
              {t('Delete explorer')}
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {t('Save changes')}
          </button>
        </div>
      </form>
    </div>
  )
}
