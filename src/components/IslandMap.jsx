import { useEffect, useMemo, useState } from 'react'
import { CUSTOM_TOPIC, topicById } from '../data/topics.js'
import { chestProgress, topicStats, unlockProgress } from '../lib/srs.js'

// Two hand-placed layouts: a wide one for desktop and a tall one for phones.
const LAYOUTS = {
  wide: {
    w: 1000,
    h: 620,
    r: 74,
    harbor: [70, 545],
    islands: [
      [225, 410],
      [395, 205],
      [565, 415],
      [745, 225],
      [865, 455],
    ],
    chest: [925, 105],
    custom: [120, 205],
    compass: [690, 565],
    clouds: [
      [550, 70],
      [235, 62],
    ],
  },
  tall: {
    w: 400,
    h: 1040,
    r: 64,
    harbor: [70, 990],
    islands: [
      [130, 845],
      [285, 690],
      [120, 535],
      [280, 380],
      [125, 230],
    ],
    chest: [300, 95],
    custom: [320, 900],
    compass: [330, 560],
    clouds: [
      [30, 60],
      [25, 405],
    ],
  },
}

function useLayout() {
  const query = '(max-width: 720px)'
  const [tall, setTall] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setTall(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return tall ? LAYOUTS.tall : LAYOUTS.wide
}

// Deterministic wobbly outline, so each island keeps its own shape.
function blobPath(seed, cx, cy, r, points = 9) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0
    return h / 4294967296
  }
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2
    const rr = r * (0.84 + rand() * 0.24)
    return [cx + Math.cos(a) * rr * 1.12, cy + Math.sin(a) * rr * 0.86]
  })
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % points]
    const p3 = pts[(i + 2) % points]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return `${d} Z`
}

function routePath(stops) {
  let d = `M${stops[0][0]},${stops[0][1]}`
  for (let i = 1; i < stops.length; i++) {
    const [x0, y0] = stops[i - 1]
    const [x1, y1] = stops[i]
    const mx = (x0 + x1) / 2
    d += ` Q${mx + (y1 - y0) * 0.25},${(y0 + y1) / 2 + (x0 - x1) * 0.12} ${x1},${y1}`
  }
  return d
}

function Island({ topic, x, y, r, stats, locked, onClick, delay }) {
  const done = stats.total > 0 && stats.mastered === stats.total
  const pct = Math.round(stats.progress * 100)
  const bannerW = Math.max(r * 2.3, topic.name.length * 9.6 + 34)
  return (
    <g
      className={`island ${locked ? 'is-locked' : ''}`}
      style={{ '--topic': topic.color, animationDelay: `${delay}ms` }}
      role="button"
      tabIndex={0}
      aria-label={`${topic.name}${locked ? ', locked' : `, ${stats.started} of ${stats.total} words started`}`}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
    >
      <path className="island-shallow" d={blobPath(topic.id + 's', x, y, r * 1.28)} />
      <path className="island-shadow" d={blobPath(topic.id, x + 5, y + 8, r)} />
      <path className="island-sand" d={blobPath(topic.id, x, y, r)} />
      <path className="island-land" d={blobPath(topic.id + 'g', x, y - r * 0.08, r * 0.74)} />
      <text className="island-icon" x={x} y={y - r * 0.02} fontSize={r * 0.62} textAnchor="middle" dominantBaseline="central">
        {locked ? '🔒' : topic.icon}
      </text>
      {done && (
        <g className="island-flag">
          <line x1={x + r * 0.55} y1={y - r * 0.4} x2={x + r * 0.55} y2={y - r * 1.05} />
          <path d={`M${x + r * 0.55},${y - r * 1.05} l${r * 0.42},${r * 0.14} l-${r * 0.42},${r * 0.14} z`} />
        </g>
      )}
      {!locked && stats.due > 0 && (
        <g className="island-badge">
          <circle cx={x + r * 0.95} cy={y - r * 0.62} r={15} />
          <text x={x + r * 0.95} y={y - r * 0.62} textAnchor="middle" dominantBaseline="central">
            {stats.due}
          </text>
        </g>
      )}
      <g className="island-banner">
        <rect x={x - bannerW / 2} y={y + r * 0.78} width={bannerW} height={40} rx={12} />
        <text className="island-name" x={x} y={y + r * 0.78 + 16} textAnchor="middle">
          {topic.name}
        </text>
        {!locked && (
          <>
            <rect className="island-bar-bg" x={x - bannerW / 2 + 14} y={y + r * 0.78 + 27} width={bannerW - 28} height={5} rx={2.5} />
            <rect
              className="island-bar"
              x={x - bannerW / 2 + 14}
              y={y + r * 0.78 + 27}
              width={((bannerW - 28) * pct) / 100}
              height={5}
              rx={2.5}
            />
          </>
        )}
      </g>
    </g>
  )
}

export default function IslandMap({ profile, onIsland, onChest, onCustom }) {
  const L = useLayout()
  const islands = useMemo(
    () =>
      profile.topics.map((id, i) => ({
        topic: topicById(id),
        pos: L.islands[i],
        stats: topicStats(profile, id),
        locked: !unlockProgress(profile, i).unlocked,
      })),
    [profile, L],
  )
  const chest = chestProgress(profile)
  const customStats = topicStats(profile, CUSTOM_TOPIC.id)
  const lastOpen = islands.reduce((acc, isl, i) => (isl.locked ? acc : i), 0)
  const route = [L.harbor, ...L.islands, L.chest]
  const traveled = route.slice(0, lastOpen + 2)
  const boat = L.islands[lastOpen]

  return (
    <svg className="map" viewBox={`0 0 ${L.w} ${L.h}`} role="img" aria-label="Your island map">
      <defs>
        <pattern id="waves" width="90" height="56" patternUnits="userSpaceOnUse">
          <path d="M8 18 q8 -7 16 0 t16 0" className="wave-line" />
          <path d="M52 44 q8 -7 16 0 t16 0" className="wave-line" />
        </pattern>
        <radialGradient id="sea-light" cx="35%" cy="30%" r="80%">
          <stop offset="0%" className="sea-hi" />
          <stop offset="100%" className="sea-lo" />
        </radialGradient>
      </defs>
      <rect width={L.w} height={L.h} fill="url(#sea-light)" />
      <rect width={L.w} height={L.h} fill="url(#waves)" className="wave-layer" />

      <g className="clouds" aria-hidden="true">
        <path className="cloud" d={`M${L.clouds[0][0]},${L.clouds[0][1]} a22,22 0 0,1 40,-10 a26,26 0 0,1 48,8 a18,18 0 0,1 2,36 h-86 a18,18 0 0,1 -4,-34z`} />
        <path className="cloud cloud-2" d={`M${L.clouds[1][0]},${L.clouds[1][1]} a18,18 0 0,1 32,-8 a22,22 0 0,1 40,6 a15,15 0 0,1 2,30 h-70 a15,15 0 0,1 -4,-28z`} />
      </g>

      <path className="route route-ahead" d={routePath(route)} />
      <path className="route route-done" d={routePath(traveled)} />

      <g className="compass" transform={`translate(${L.compass[0]} ${L.compass[1]})`} aria-hidden="true">
        <circle r="26" />
        <path d="M0,-22 L6,0 L0,22 L-6,0 Z" />
        <path className="compass-n" d="M0,-22 L6,0 L-6,0 Z" />
        <text y="-32" textAnchor="middle">
          N
        </text>
      </g>

      <g className="harbor" transform={`translate(${L.harbor[0]} ${L.harbor[1]})`}>
        <rect x="-38" y="-8" width="76" height="16" rx="4" />
        <line x1="-28" y1="8" x2="-28" y2="24" />
        <line x1="28" y1="8" x2="28" y2="24" />
        <text y="-18" textAnchor="middle">
          Harbor
        </text>
      </g>

      <g
        className="island custom-island"
        style={{ '--topic': CUSTOM_TOPIC.color }}
        role="button"
        tabIndex={0}
        aria-label={`My Island, ${customStats.total} words of your own`}
        onClick={onCustom}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onCustom())}
      >
        <path className="island-shallow" d={blobPath('custom-s', L.custom[0], L.custom[1], L.r * 0.82)} />
        <path className="island-sand" d={blobPath('custom', L.custom[0], L.custom[1], L.r * 0.62)} />
        <text className="island-icon" x={L.custom[0]} y={L.custom[1]} fontSize={L.r * 0.46} textAnchor="middle" dominantBaseline="central">
          {CUSTOM_TOPIC.icon}
        </text>
        <text className="island-caption" x={L.custom[0]} y={L.custom[1] + L.r * 0.82} textAnchor="middle">
          {customStats.total ? `My Island · ${customStats.total}` : '+ My words'}
        </text>
      </g>

      {islands.map((isl, i) => (
        <Island
          key={isl.topic.id}
          topic={isl.topic}
          x={isl.pos[0]}
          y={isl.pos[1]}
          r={L.r}
          stats={isl.stats}
          locked={isl.locked}
          delay={i * 90}
          onClick={() => onIsland(isl.topic.id, i)}
        />
      ))}

      <g className="boat" transform={`translate(${boat[0] - L.r * 1.25} ${boat[1] + L.r * 0.15})`} aria-hidden="true">
        <g className="boat-bob">
          <path className="boat-hull" d="M-22,0 h44 l-8,13 h-28 z" />
          <line x1="0" y1="0" x2="0" y2="-34" />
          <path className="boat-sail" d="M2,-32 L22,-6 H2 Z" />
        </g>
      </g>

      <g
        className={`chest ${chest.ready ? 'is-ready' : ''}`}
        transform={`translate(${L.chest[0]} ${L.chest[1]})`}
        role="button"
        tabIndex={0}
        aria-label={chest.ready ? 'Treasure chest is ready to open' : `Treasure chest: ${chest.strong} of ${chest.total} words strong`}
        onClick={onChest}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onChest())}
      >
        {chest.ready && <circle className="chest-glow" r="48" />}
        <path className="chest-x" d="M-14,30 l28,14 M14,30 l-28,14" />
        <rect className="chest-body" x="-28" y="-6" width="56" height="34" rx="5" />
        <path className="chest-lid" d="M-30,-6 q30,-30 60,0 z" />
        <rect className="chest-lock" x="-6" y="-2" width="12" height="13" rx="2" />
        <text className="island-caption" y="64" textAnchor="middle">
          {chest.ready ? 'Open me!' : `${chest.strong}/${chest.total}`}
        </text>
      </g>
    </svg>
  )
}
