import { LEVELS, TOPICS, PICK_COUNT } from '../data/topics.js'
import { AVATARS, AVATAR_COLORS } from '../lib/storage.js'
import { play } from '../lib/sound.js'

export function Avatar({ avatar, color, size = 56 }) {
  return (
    <span className="avatar" style={{ '--avatar-bg': color, width: size, height: size, fontSize: size * 0.55 }}>
      {avatar}
    </span>
  )
}

export function AvatarPicker({ avatar, color, onChange }) {
  return (
    <div className="avatar-picker">
      <div className="avatar-grid" role="radiogroup" aria-label="Avatar">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={a === avatar}
            className={`avatar-option ${a === avatar ? 'is-on' : ''}`}
            style={{ '--avatar-bg': color }}
            onClick={() => {
              play('tap')
              onChange({ avatar: a, color })
            }}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="color-row" role="radiogroup" aria-label="Color">
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`Color ${c}`}
            className={`color-dot ${c === color ? 'is-on' : ''}`}
            style={{ background: c }}
            onClick={() => onChange({ avatar, color: c })}
          />
        ))}
      </div>
    </div>
  )
}

export function LevelPicker({ value, onChange }) {
  return (
    <div className="level-grid" role="radiogroup" aria-label="Level">
      {LEVELS.map((l, i) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={value === l.id}
          className={`level-card ${value === l.id ? 'is-on' : ''}`}
          onClick={() => {
            play('tap')
            onChange(l.id)
          }}
        >
          <span className="level-stars" aria-hidden="true">
            {'★'.repeat(i + 1)}
            <span className="dim">{'★'.repeat(LEVELS.length - i - 1)}</span>
          </span>
          <span className="level-name">{l.name}</span>
          <span className="level-blurb">{l.blurb}</span>
          <span className="level-hint">{l.hint}</span>
        </button>
      ))}
    </div>
  )
}

export function TopicPicker({ value, onChange }) {
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((t) => t !== id))
    else if (value.length < PICK_COUNT) {
      play('tap')
      onChange([...value, id])
    }
  }
  return (
    <>
      <p className="pick-counter" aria-live="polite">
        <strong>{value.length}</strong> / {PICK_COUNT} islands chosen
        {value.length === PICK_COUNT && <span className="pick-done"> · Ready to sail!</span>}
      </p>
      <div className="topic-grid">
        {TOPICS.map((t) => {
          const order = value.indexOf(t.id)
          const on = order >= 0
          const full = !on && value.length >= PICK_COUNT
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              disabled={full}
              className={`topic-card ${on ? 'is-on' : ''}`}
              style={{ '--topic': t.color }}
              onClick={() => toggle(t.id)}
            >
              <span className="topic-icon" aria-hidden="true">
                {t.icon}
              </span>
              <span className="topic-name">{t.name}</span>
              {on && <span className="topic-order">{order + 1}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}
