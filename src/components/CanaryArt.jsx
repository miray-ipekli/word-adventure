import { useId } from 'react'
import { useT } from '../lib/i18n.js'

// A yellow canary perched on a branch, side view, in a navy-and-yellow striped scarf.
// Drawn to sit among the animal emojis.
const NAVY = '#13235B'

export default function CanaryArt() {
  const t = useT()
  // useId can contain characters like ":" that break url(#...) references, so keep only safe ones.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const body = `canary-body-${id}`
  const wing = `canary-wing-${id}`
  const wood = `canary-wood-${id}`
  return (
    <svg className="drawn-avatar" viewBox="0 0 64 64" role="img" aria-label={t('Canary')}>
      <defs>
        <radialGradient id={body} cx="0.3" cy="0.25" r="0.85">
          <stop offset="0" stopColor="#FFF27A" />
          <stop offset="0.5" stopColor="#FFD60A" />
          <stop offset="1" stopColor="#F0A800" />
        </radialGradient>
        <linearGradient id={wing} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC93C" />
          <stop offset="1" stopColor="#E69500" />
        </linearGradient>
        <linearGradient id={wood} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9713F" />
          <stop offset="1" stopColor="#6E4421" />
        </linearGradient>
      </defs>

      {/* branch, with a leaf */}
      <path d="M1 50 C18 47.5 40 49.5 63 46.5 L63 50.5 C40 53.5 18 52 1 54.5 Z" fill={`url(#${wood})`} />
      <path d="M8 51 C6 55 8 59 12 59 C12 55 11 52 8 51 Z" fill="#5FB548" />

      {/* long forked tail with navy tips */}
      <path d="M47 36 L62 41.5 L59.5 44.5 L63 48.5 L46 43 Z" fill={`url(#${wing})`} />
      <path d="M57 39.7 L62 41.5 L59.5 44.5 L63 48.5 L57.5 46.6 Z" fill={NAVY} />

      {/* head and body in one slim shape */}
      <path
        d="M15 22 C15 15 21 11 27 12 C33 13 36 18 38 23 C43 26 49 31 53 37 C50 42 44 47 36 48 C27 49 19 44 17 36 C16 31 15 27 15 22 Z"
        fill={`url(#${body})`}
      />

      {/* folded wing with feather lines */}
      <path d="M27 30 C35 26.5 46 30 53 38 C46 42 37 43 30.5 39.5 C27.5 37.5 26 33.5 27 30 Z" fill={`url(#${wing})`} />
      <path d="M31 33 C37 31.5 43 33.5 48.5 37.2" stroke={NAVY} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M31.5 37 C36.5 38.3 42 39.2 47 39.6" stroke={NAVY} strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* legs gripping the branch */}
      <path d="M29 46.5 L28 50.5 M36 47 L36 50" stroke="#E07B00" strokeWidth="2" strokeLinecap="round" />
      <path d="M25.5 51 Q28 49 30.5 51 M33.5 50.4 Q36 48.6 38.5 50.2" stroke="#E07B00" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* scarf around the neck, end hanging over the chest */}
      <path d="M15.5 27 C21 31 31 31 38 24.5 L40 28.5 C33 35 21 35 15.5 32 Z" fill={NAVY} />
      <path d="M16 29.6 C22 33 32 32.6 39 26.7" stroke="#FFD60A" strokeWidth="1.5" fill="none" />
      <path d="M19 32 L17.5 43 L23 43 L24 33 Z" fill={NAVY} />
      <path d="M18.4 36.2 L23.6 36.6 M18 39.8 L23.3 40" stroke="#FFD60A" strokeWidth="1.5" />
      <path d="M17.8 43 L17.5 45.5 M19.6 43 L19.5 46 M21.4 43 L21.5 46 M23 43 L23.4 45.5" stroke={NAVY} strokeWidth="1.1" strokeLinecap="round" />

      {/* small pointed beak and eye */}
      <path d="M15.6 18.6 L9.5 21.2 L15.6 23.6 Z" fill="#F28C28" />
      <path d="M15.4 21.2 L10 21.2" stroke="#B85C00" strokeWidth="0.7" />
      <circle cx="21.5" cy="18.5" r="2" fill="#1A1A2E" />
      <circle cx="22.2" cy="17.8" r="0.7" fill="#FFFFFF" />
    </svg>
  )
}
