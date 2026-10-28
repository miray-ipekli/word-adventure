import { useEffect, useState } from 'react'
import { Avatar } from './Pickers.jsx'
import { levelName } from '../lib/srs.js'
import { play } from '../lib/sound.js'
import Modal from './Modal.jsx'
import PinPad from './PinPad.jsx'

const MAX_TRIES = 5
const COOL_DOWN = 30

export default function ProfilePicker({ profiles, status, legacyCount, onMigrate, onUnlock, onNew }) {
  const [picked, setPicked] = useState(null)

  return (
    <div className="screen sea-screen">
      <div className="welcome">
        <div className="logo" aria-hidden="true">
          <span className="logo-flag" />
        </div>
        <h1 className="title-xl">Word Adventure</h1>
        <p className="lead">
          {profiles.length ? "Who's exploring today?" : 'Sail between islands, collect words and learn to speak English with confidence.'}
        </p>

        {legacyCount > 0 && (
          <div className="notice sticker">
            <span>
              <strong>
                {legacyCount} explorer{legacyCount > 1 ? 's' : ''} saved only on this device.
              </strong>{' '}
              Move {legacyCount > 1 ? 'them' : 'it'} to the cloud to play on any device.
            </span>
            <button type="button" className="btn btn-primary btn-small" onClick={onMigrate}>
              Move to cloud
            </button>
          </div>
        )}

        {status === 'loading' && !profiles.length && <p className="lead">Loading explorers…</p>}
        {status === 'offline' && (
          <p className="notice sticker">
            You are offline. Explorers you played on this device still work, and your progress will upload when you are back online.
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
              <span className="chip">{levelName(p.level)}</span>
              <span className="profile-meta">
                Rank {p.rank} · {p.streak > 0 ? `${p.streak}-day streak` : 'No streak yet'}
              </span>
            </button>
          ))}
          <button type="button" className="profile-card profile-new" onClick={onNew}>
            <span className="plus" aria-hidden="true">
              +
            </span>
            <span className="profile-name">{profiles.length ? 'New explorer' : 'Create your explorer'}</span>
            <span className="profile-meta">Pick a level, 5 islands and a PIN</span>
          </button>
        </div>
      </div>

      {picked && <UnlockDialog profile={picked} onUnlock={onUnlock} onClose={() => setPicked(null)} />}
    </div>
  )
}

function UnlockDialog({ profile, onUnlock, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tries, setTries] = useState(0)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (!wait) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
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
      setError(`Too many tries. Wait ${COOL_DOWN} seconds.`)
    } else {
      setError('Wrong PIN. Try again.')
    }
  }

  return (
    <Modal label={`Enter PIN for ${profile.name}`} onClose={onClose}>
      <div className="unlock">
        <Avatar avatar={profile.avatar} color={profile.color} size={84} />
        <h2 className="title-lg">Hi {profile.name}!</h2>
        <p className="muted">Enter your PIN to continue your adventure.</p>
        <PinPad busy={busy || wait > 0} error={wait ? `Too many tries. Wait ${wait} s.` : error} onComplete={submit} />
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Not me
        </button>
      </div>
    </Modal>
  )
}
