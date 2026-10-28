import { useEffect, useState } from 'react'
import { play } from '../lib/sound.js'

export const PIN_LENGTH = 4
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

// A big, phone-style keypad. Calls onComplete once four digits are entered.
export default function PinPad({ error, busy, onComplete }) {
  const [pin, setPin] = useState('')

  useEffect(() => {
    if (error) setPin('')
  }, [error])

  const press = (k) => {
    if (busy) return
    if (k === '⌫') return setPin((p) => p.slice(0, -1))
    if (!/\d/.test(k) || pin.length >= PIN_LENGTH) return
    play('tap')
    const next = pin + k
    setPin(next)
    if (next.length === PIN_LENGTH) {
      onComplete(next)
      setTimeout(() => setPin(''), 300)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('⌫')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={`pinpad ${error ? 'is-error' : ''}`}>
      <div className="pin-dots" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`pin-dot ${i < pin.length ? 'is-on' : ''}`} />
        ))}
      </div>
      <p className="pin-message" aria-live="polite">
        {busy ? 'Checking…' : error || ' '}
      </p>
      <div className="pin-keys">
        {KEYS.map((k, i) =>
          k ? (
            <button key={i} type="button" className="pin-key" onClick={() => press(k)} disabled={busy} aria-label={k === '⌫' ? 'Delete' : k}>
              {k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  )
}

// Asks for a new PIN twice so a typo does not lock the explorer out.
export function NewPin({ busy, error: outerError, onDone }) {
  const [first, setFirst] = useState(null)
  const [error, setError] = useState('')
  return (
    <div className="new-pin">
      <p className="new-pin-step">{first ? 'Type the same PIN again' : `Choose a ${PIN_LENGTH}-digit PIN`}</p>
      <PinPad
        key={first ? 'confirm' : 'choose'}
        busy={busy}
        error={error || outerError}
        onComplete={(pin) => {
          if (!first) {
            setError('')
            setFirst(pin)
          } else if (pin === first) {
            onDone(pin)
          } else {
            play('wrong')
            setFirst(null)
            setError("The PINs didn't match. Let's start again.")
          }
        }}
      />
    </div>
  )
}
