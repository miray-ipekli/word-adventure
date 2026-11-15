import { useState } from 'react'
import { LEVELS, TOPICS, PICK_COUNT } from '../data/topics.js'
import { AVATAR_COLORS, AVATAR_GROUPS, avatarGroupOf, CANARY } from '../lib/storage.js'
import { isManifestAvatar, manifestMember } from '../data/manifest.js'
import { play } from '../lib/sound.js'
import ManifestPhoto from './ManifestPhoto.jsx'
import CanaryArt from './CanaryArt.jsx'
import manifestLogo from '../assets/manifest/logo.webp'

// An avatar is an emoji, the drawn canary, or the id of a Manifest member's photo.
function AvatarArt({ avatar }) {
  if (avatar === CANARY) return <CanaryArt />
  return isManifestAvatar(avatar) ? <ManifestPhoto avatar={avatar} /> : avatar
}

export function Avatar({ avatar, color, size = 56 }) {
  return (
    <span
      className={`avatar ${isManifestAvatar(avatar) ? 'is-photo' : ''}`}
      style={{ '--avatar-bg': color, width: size, height: size, fontSize: size * 0.55 }}
    >
      <AvatarArt avatar={avatar} />
    </span>
  )
}

// The picture on each group's card.
function GroupArt({ id }) {
  if (id === 'manifest') return <img className="group-logo" src={manifestLogo} alt="" draggable="false" />
  return (
    <span className="group-animals" aria-hidden="true">
      <span>🐼</span>
      <span>🦊</span>
      <span>🐯</span>
    </span>
  )
}

export function AvatarPicker({ avatar, color, onChange }) {
  // The group of the current avatar starts open; tapping an open group closes it again.
  const [open, setOpen] = useState(() => avatarGroupOf(avatar))
  const current = avatarGroupOf(avatar)
  const group = AVATAR_GROUPS.find((g) => g.id === open)

  return (
    <div className="avatar-picker">
      <div className="avatar-groups">
        {AVATAR_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-expanded={g.id === open}
            aria-controls="avatar-group-panel"
            className={`avatar-group ${g.id === open ? 'is-open' : ''}`}
            onClick={() => {
              play('tap')
              setOpen(g.id === open ? null : g.id)
            }}
          >
            <span className="group-art">
              <GroupArt id={g.id} />
            </span>
            <span className="group-name">
              {g.name} <span className="group-count">{g.avatars.length}</span>
            </span>
            {g.id === current && (
              <span className="group-current" title="Your avatar is in this group">
                <Avatar avatar={avatar} color={color} size={30} />
              </span>
            )}
          </button>
        ))}
      </div>
      {group && (
        <div id="avatar-group-panel" className="avatar-grid" role="radiogroup" aria-label={`${group.name} avatars`}>
          {group.avatars.map((a) => {
            const m = manifestMember(a)
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={a === avatar}
                aria-label={m ? `${m.name} from Manifest` : a === CANARY ? 'Canary' : undefined}
                className={`avatar-option ${m ? 'is-photo' : ''} ${a === avatar ? 'is-on' : ''}`}
                style={{ '--avatar-bg': color }}
                onClick={() => {
                  play('tap')
                  onChange({ avatar: a, color })
                }}
              >
                <AvatarArt avatar={a} />
              </button>
            )
          })}
        </div>
      )}
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
