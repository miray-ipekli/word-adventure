import { useEffect, useState } from 'react'
import { Avatar, LangSwitch } from './Pickers.jsx'
import { levelName } from '../lib/srs.js'
import { play } from '../lib/sound.js'
import { useT } from '../lib/i18n.js'
import Modal from './Modal.jsx'
import PinPad from './PinPad.jsx'

const MAX_TRIES = 5
const COOL_DOWN = 30

export default function ProfilePicker({ profiles, status, lang, onLang, onUnlock, onNew }) {
  const t = useT()
  const [picked, setPicked] = useState(null)

  return (
    <div className="screen sea-screen">
      <div className="screen-corner">
        <LangSwitch value={lang} onChange={onLang} />
      </div>
      <div className="welcome">
        <div className="logo" aria-hidden="true">
          <span className="logo-flag" />
        </div>
        <h1 className="title-xl">Word Adventure</h1>
        <p className="lead">
          {profiles.length ? t("Who's exploring today?") : t('Sail between islands, collect words and learn to speak English with confidence.')}
        </p>

        {status === 'loading' && !profiles.length && <p className="lead">{t('Loading explorers…')}</p>}
        {status === 'offline' && (
          <p className="notice sticker">
            {t('You are offline. Explorers you played on this device still work, and your progress will upload when you are back online.')}
          </p>
        )}

        <div className="profile-grid">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className="profile-card sticker"
              onClick={() => {
                play('tap')
                setPicked(p)
              }}
            >
              <Avatar avatar={p.avatar} color={p.color} size={72} />
              <span className="profile-name">{p.name}</span>
              <span className="chip">{t(levelName(p.level))}</span>
              <span className="profile-meta">
                {t('Rank {n}', { n: p.rank })} · {p.streak > 0 ? t('{n}-day streak', { n: p.streak }) : t('No streak yet')}
              </span>
            </button>
          ))}
          <button type="button" className="profile-card profile-new" onClick={onNew}>
            <span className="plus" aria-hidden="true">
              +
            </span>
            <span className="profile-name">{profiles.length ? t('New explorer') : t('Create your explorer')}</span>
            <span className="profile-meta">{t('Pick a level, 5 islands and a PIN')}</span>
          </button>
        </div>
      </div>

      {picked && <UnlockDialog profile={picked} onUnlock={onUnlock} onClose={() => setPicked(null)} />}
    </div>
  )
}

function UnlockDialog({ profile, onUnlock, onClose }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tries, setTries] = useState(0)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (!wait) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const submit = async (pin) => {
    if (wait) return
    setBusy(true)
    setError('')
    const result = await onUnlock(profile.id, pin)
    setBusy(false)
    if (result === 'ok') return
    play('wrong')
    if (result === 'offline') return setError("Can't reach the cloud. Check your internet connection.")
    const n = tries + 1
    setTries(n)
    if (n >= MAX_TRIES) {
      setTries(0)
      setWait(COOL_DOWN)
      setError(t('Too many tries. Wait {n} seconds.', { n: COOL_DOWN }))
    } else {
      setError('Wrong PIN. Try again.')
    }
  }

  return (
    <Modal label={t('Enter PIN for {name}', { name: profile.name })} onClose={onClose}>
      <div className="unlock">
        <Avatar avatar={profile.avatar} color={profile.color} size={84} />
        <h2 className="title-lg">{t('Hi {name}!', { name: profile.name })}</h2>
        <p className="muted">{t('Enter your PIN to continue your adventure.')}</p>
        <PinPad busy={busy || wait > 0} error={wait ? t('Too many tries. Wait {n} s.', { n: wait }) : error} onComplete={submit} />
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t('Not me')}
        </button>
      </div>
    </Modal>
  )
}
