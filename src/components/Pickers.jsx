import { useState } from 'react'
import { LEVELS, TOPICS, PICK_COUNT } from '../data/topics.js'
import { AVATAR_COLORS, AVATAR_GROUPS, avatarBackground, avatarGroupOf, CANARY, STRIPES } from '../lib/storage.js'
import { isManifestAvatar, manifestMember } from '../data/manifest.js'
import { play } from '../lib/sound.js'
import { LANGS, useT } from '../lib/i18n.js'
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
      style={{ '--avatar-bg': avatarBackground(color), width: size, height: size, fontSize: size * 0.55 }}
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
  const t = useT()
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
              {t(g.name)} <span className="group-count">{g.avatars.length}</span>
            </span>
            {g.id === current && (
              <span className="group-current" title={t('Your avatar is in this group')}>
                <Avatar avatar={avatar} color={color} size={30} />
              </span>
            )}
          </button>
        ))}
      </div>
      {group && (
        <div id="avatar-group-panel" className="avatar-grid" role="radiogroup" aria-label={t('{name} avatars', { name: t(group.name) })}>
          {group.avatars.map((a) => {
            const m = manifestMember(a)
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={a === avatar}
                aria-label={m ? t('{name} from Manifest', { name: m.name }) : a === CANARY ? t('Canary') : undefined}
                className={`avatar-option ${m ? 'is-photo' : ''} ${a === avatar ? 'is-on' : ''}`}
                style={{ '--avatar-bg': avatarBackground(color) }}
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
      <div className="color-row" role="radiogroup" aria-label={t('Color')}>
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={c === STRIPES ? t('Yellow and navy stripes') : t('Color {c}', { c })}
            title={c === STRIPES ? t('Yellow and navy stripes') : undefined}
            className={`color-dot ${c === color ? 'is-on' : ''}`}
            style={{ background: avatarBackground(c) }}
            onClick={() => onChange({ avatar, color: c })}
          />
        ))}
      </div>
    </div>
  )
}

export function LevelPicker({ value, onChange }) {
  const t = useT()
  return (
    <div className="level-grid" role="radiogroup" aria-label={t('Level')}>
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
          <span className="level-name">{t(l.name)}</span>
          <span className="level-blurb">{t(l.blurb)}</span>
          <span className="level-hint">{l.hint}</span>
        </button>
      ))}
    </div>
  )
}

export function TopicPicker({ value, onChange }) {
  const t = useT()
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else if (value.length < PICK_COUNT) {
      play('tap')
      onChange([...value, id])
    }
  }
  return (
    <>
      <p className="pick-counter" aria-live="polite">
        <strong>{value.length}</strong> / {t('{n} islands chosen', { n: PICK_COUNT })}
        {value.length === PICK_COUNT && <span className="pick-done"> · {t('Ready to sail!')}</span>}
      </p>
      <div className="topic-grid">
        {TOPICS.map((topic) => {
          const order = value.indexOf(topic.id)
          const on = order >= 0
          const full = !on && value.length >= PICK_COUNT
          return (
            <button
              key={topic.id}
              type="button"
              aria-pressed={on}
              disabled={full}
              className={`topic-card ${on ? 'is-on' : ''}`}
              style={{ '--topic': topic.color }}
              onClick={() => toggle(topic.id)}
            >
              <span className="topic-icon" aria-hidden="true">
                {topic.icon}
              </span>
              <span className="topic-name">{t(topic.name)}</span>
              {on && <span className="topic-order">{order + 1}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

// Interface language: English or Turkish. Words being learned always stay English.
export function LangPicker({ value, onChange }) {
  const t = useT()
  return (
    <div className="filter-row" role="radiogroup" aria-label={t('Menu language')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={value === l.id}
          className={`filter ${value === l.id ? 'is-on' : ''}`}
          onClick={() => {
            play('tap')
            onChange(l.id)
          }}
        >
          {l.name}
        </button>
      ))}
    </div>
  )
}

// Small switch for the corner of the start screen.
export function LangSwitch({ value, onChange }) {
  const t = useT()
  const other = LANGS.find((l) => l.id !== value) ?? LANGS[0]
  return (
    <button
      type="button"
      className="btn btn-small lang-switch"
      onClick={() => {
        play('tap')
        onChange(other.id)
      }}
      aria-label={t('Menu language')}
      title={t('Menu language')}
    >
      <span aria-hidden="true">🌐</span> {other.name}
    </button>
  )
}
