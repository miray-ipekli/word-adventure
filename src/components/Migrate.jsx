import { useState } from 'react'
import { levelName } from '../lib/srs.js'
import { Avatar } from './Pickers.jsx'
import { NewPin } from './PinPad.jsx'

// Moves explorers saved by the first version of the game (this device only) to the cloud.
export default function Migrate({ profiles, onMove, onExit }) {
  const [current, setCurrent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [moved, setMoved] = useState([])

  const move = async (pin) => {
    setBusy(true)
    setError('')
    try {
      await onMove(current, pin)
      setMoved((m) => [...m, current.name])
      setCurrent(null)
    } catch {
      setError("Couldn't reach the cloud. Check your internet connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen sea-screen">
      <div className="panel sticker onboarding">
        {current ? (
          <section className="step step-pin">
            <div className="step-head">
              <Avatar avatar={current.avatar} color={current.color} size={72} />
              <div>
                <h2 className="title-lg">A PIN for {current.name}</h2>
                <p className="muted">All words, XP and streak move with it. You will use this PIN on every device.</p>
              </div>
            </div>
            <NewPin busy={busy} error={error} onDone={move} />
            <button type="button" className="btn btn-ghost" onClick={() => setCurrent(null)} disabled={busy}>
              Back
            </button>
          </section>
        ) : (
          <section className="step">
            <h2 className="title-lg">Move explorers to the cloud</h2>
            <p className="muted">
              These explorers are saved only in this browser. Give each one a PIN to keep their progress and play on any device.
            </p>
            {moved.length > 0 && (
              <p className="success-note" role="status">
                Moved: {moved.join(', ')}
              </p>
            )}
            <ul className="migrate-list">
              {profiles.map((p) => (
                <li key={p.id} className="migrate-row">
                  <Avatar avatar={p.avatar} color={p.color} size={52} />
                  <span className="word-row-text">
                    <strong>{p.name}</strong>
                    <span className="muted">
                      {levelName(p.level)} · {Object.keys(p.cards ?? {}).length} words started · {p.xp ?? 0} XP
                    </span>
                  </span>
                  <button type="button" className="btn btn-primary btn-small" onClick={() => setCurrent(p)}>
                    Set PIN &amp; move
                  </button>
                </li>
              ))}
            </ul>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={onExit}>
                {profiles.length ? 'Later' : 'Done'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
