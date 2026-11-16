import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CUSTOM_TOPIC, topicById } from '../data/topics.js'
import { topicStats } from '../lib/srs.js'
import { chestProgress, islandState } from '../lib/islands.js'
import { useT } from '../lib/i18n.js'

// The home map: a small tropical sea seen from above, lit from the top left. Everything is drawn
// here as SVG (no image files): depth comes from layered shapes and gradients, not from outlines.
// Soft shapes use gradients instead of blur filters, so the animations stay cheap on phones.
//
// The map is a stack of layers (see .map-stack in styles.css):
//   sea colour and drifting waves   plain CSS backgrounds
//   glints of light on the water    three sheets of stars that fade in and out
//   the map itself                  the SVG drawn here
//   clouds and gulls                small SVGs floating on top
// The waves, glints, clouds and gulls move all over the map. On their own layers the browser just
// slides them; inside the map SVG every frame of theirs would redraw all the islands.
//
// Small movements inside the SVG use its own <animate> elements (Move and Fade below), not CSS
// animations: they add to an element's transform attribute, and a CSS animation would replace it.

// Two hand-placed layouts: a wide one for desktop and a tall one for phones.
const LAYOUTS = {
  wide: {
    w: 1000,
    h: 616,
    r: 74,
    harbor: [78, 546],
    islands: [
      [235, 408],
      [400, 210],
      [570, 412],
      [745, 228],
      [868, 448],
    ],
    chest: [922, 98],
    custom: [118, 200],
    compass: [690, 556],
    clouds: [
      [520, 34, 1.25],
      [215, 22, 1],
    ],
  },
  tall: {
    w: 400,
    h: 1080,
    r: 62,
    harbor: [76, 1012],
    islands: [
      [128, 845],
      [282, 690],
      [120, 535],
      [278, 380],
      [124, 232],
    ],
    chest: [306, 92],
    custom: [318, 905],
    compass: [338, 548],
    clouds: [
      [16, 30, 0.9],
      [10, 632, 0.8],
    ],
  },
}

function useLayout() {
  return useMedia('(max-width: 720px)') ? LAYOUTS.tall : LAYOUTS.wide
}

function useMedia(query) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setOn(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return on
}

// True where nothing should move: for people who asked their device for less motion, and
// inside locked islands.
const Still = createContext(false)
const EASE = '0.45 0 0.55 1'

function timing({ values, dur, begin, keyTimes, linear }) {
  return {
    values: values.join(';'),
    dur: `${dur}s`,
    begin: begin ? `${begin}s` : undefined,
    repeatCount: 'indefinite',
    keyTimes: keyTimes?.join(';'),
    calcMode: linear ? 'linear' : 'spline',
    keySplines: linear ? undefined : Array(values.length - 1).fill(EASE).join(';'),
  }
}

// Moves, turns or scales the element it is placed in, around that element's own origin.
function Move({ type = 'translate', ...rest }) {
  if (useContext(Still)) return null
  return <animateTransform attributeName="transform" type={type} additive="sum" {...timing(rest)} />
}

// Changes one attribute of the element it is placed in (opacity unless told otherwise).
function Fade({ attr = 'opacity', ...rest }) {
  if (useContext(Still)) return null
  return <animate attributeName={attr} {...timing(rest)} />
}

function hash(seed) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// Small repeatable random numbers, so every island keeps its own shape and scenery.
function rng(seed) {
  let h = hash(seed)
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    return h / 4294967296
  }
}

// A wobbly closed outline. The same seed gives the same shape at any size, which is what lets
// the shallow water, the cliff and the sand sit exactly on top of each other.
function blobPath(seed, cx, cy, r, points = 9) {
  const rand = rng(seed)
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2
    const rr = r * (0.86 + rand() * 0.22)
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

function MapDefs() {
  return (
    <defs>
      <radialGradient id="m-shoal">
        <stop offset="0" stopColor="#d6fff3" stopOpacity="0.95" />
        <stop offset="0.6" stopColor="#a4f5e6" stopOpacity="0.75" />
        <stop offset="1" stopColor="#8cecdf" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="m-shade">
        <stop offset="0" stopColor="#05304f" stopOpacity="0.38" />
        <stop offset="1" stopColor="#05304f" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="m-mist">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.92" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="m-glow">
        <stop offset="0" stopColor="#fff6b8" stopOpacity="0.95" />
        <stop offset="1" stopColor="#ffd54a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="m-sand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff8de" />
        <stop offset="1" stopColor="#f0c676" />
      </linearGradient>
      <linearGradient id="m-cliff" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dcae66" />
        <stop offset="1" stopColor="#9b6934" />
      </linearGradient>
      <linearGradient id="m-grass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#bdf47e" />
        <stop offset="1" stopColor="#3dae5b" />
      </linearGradient>
      <linearGradient id="m-hill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#93e37b" />
        <stop offset="1" stopColor="#2c9550" />
      </linearGradient>
      <linearGradient id="m-rock" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#d3dbe4" />
        <stop offset="1" stopColor="#74828f" />
      </linearGradient>
      <linearGradient id="m-plate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#eaf0f7" />
      </linearGradient>
      <linearGradient id="m-bar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#84e58f" />
        <stop offset="1" stopColor="#1fa85a" />
      </linearGradient>
      <linearGradient id="m-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffec94" />
        <stop offset="1" stopColor="#f0a400" />
      </linearGradient>
      <linearGradient id="m-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#cf9253" />
        <stop offset="1" stopColor="#855023" />
      </linearGradient>
      <linearGradient id="m-wood-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9a5e2c" />
        <stop offset="1" stopColor="#5f3613" />
      </linearGradient>
      <linearGradient id="m-hull" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e7693f" />
        <stop offset="1" stopColor="#983216" />
      </linearGradient>
      <linearGradient id="m-sail" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#d5e3f1" />
      </linearGradient>
      <linearGradient id="m-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#d9eafb" />
      </linearGradient>
      <radialGradient id="m-badge" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#ff8f7d" />
        <stop offset="1" stopColor="#e23a31" />
      </radialGradient>
      <linearGradient id="m-lock-ring" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#c8d3df" />
      </linearGradient>
      <linearGradient id="m-lock-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a3b5c8" />
        <stop offset="1" stopColor="#566b83" />
      </linearGradient>
    </defs>
  )
}

// Glints of sunlight on the water: three sheets of little stars, each fading in and out at its
// own pace (see .map-glints). Sheets, because one star at a time inside the map SVG would make
// the browser redraw the whole map on every frame.
function Glints({ w, h }) {
  const sheets = useMemo(() => {
    const rand = rng(`glint-${w}`)
    const stars = Array.from({ length: Math.round((w * h) / 36000) }, () => ({
      x: Math.round(24 + rand() * (w - 48)),
      y: Math.round(24 + rand() * (h - 48)),
      s: (0.6 + rand() * 0.7).toFixed(2),
    }))
    return [0, 1, 2].map((n) => stars.filter((_, i) => i % 3 === n))
  }, [w, h])
  return sheets.map((stars, n) => (
    <svg key={n} className={`map-glints map-glints-${n}`} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {stars.map((p, i) => (
        <path key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`} fill="#ffffff" d="M0,-7 L1.5,-1.5 L7,0 L1.5,1.5 L0,7 L-1.5,1.5 L-7,0 L-1.5,-1.5 Z" />
      ))}
    </svg>
  ))
}

function Palm({ x, y, s = 1, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="6" cy="2" rx="15" ry="4.5" fill="#0b3a24" opacity="0.2" />
      <g>
        <Move type="rotate" values={[-2.5, 2.5, -2.5]} dur={9 + (Math.abs(x) % 3)} />
        <path d="M0,0 C-2,-14 3,-27 8,-39" fill="none" stroke="#7d4f24" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M-1.2,-1 C-3,-14 2,-27 7,-38" fill="none" stroke="#c08a4a" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8,-39 C-6,-53 -23,-47 -27,-34 C-15,-43 -3,-41 8,-39 Z" fill="#2a9a4d" />
        <path d="M8,-39 C22,-55 41,-47 43,-32 C31,-43 19,-41 8,-39 Z" fill="#37b861" />
        <path d="M8,-39 C2,-59 -11,-63 -21,-57 C-9,-57 2,-49 8,-39 Z" fill="#49c96f" />
        <path d="M8,-39 C16,-59 31,-63 39,-55 C27,-57 14,-49 8,-39 Z" fill="#2a9a4d" />
        <path d="M8,-39 C6,-53 10,-63 17,-67 C15,-57 12,-47 8,-39 Z" fill="#62d882" />
        <circle cx="6" cy="-37" r="3" fill="#6f4420" />
        <circle cx="11" cy="-36" r="2.6" fill="#8a5a2b" />
      </g>
    </g>
  )
}

function Pine({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="4" cy="2" rx="13" ry="4" fill="#0b3a24" opacity="0.2" />
      <rect x="-2.5" y="-10" width="5" height="12" rx="1.5" fill="#7d4f24" />
      <path d="M0,-46 L13,-24 H-13 Z" fill="#2f9a55" />
      <path d="M0,-36 L16,-12 H-16 Z" fill="#268a4a" />
      <path d="M0,-46 L13,-24 H0 Z M0,-36 L16,-12 H0 Z" fill="#0b3a24" opacity="0.16" />
    </g>
  )
}

// Hills, peaks and trees. Three sets, so neighboring islands do not look alike.
function Scenery({ variant }) {
  if (variant === 1) {
    return (
      <>
        <path d="M6,-16 L37,-73 Q42,-81 47,-73 L80,-16 Q44,-3 6,-16 Z" fill="url(#m-rock)" />
        <path d="M42,-79 Q45,-79 47,-73 L80,-16 Q62,-9 44,-9 Z" fill="#0b2740" opacity="0.16" />
        <path d="M42,-79 Q39,-79 36,-71 L29,-58 L36,-62 L41,-54 L47,-62 L55,-58 L48,-71 Q45,-79 42,-79 Z" fill="#ffffff" />
        <Palm x={-56} y={-4} />
        <Palm x={-72} y={14} s={0.78} flip />
        <circle cx="-34" cy="20" r="8" fill="#2f9e53" />
        <circle cx="-25" cy="24" r="6" fill="#49c96f" />
      </>
    )
  }
  if (variant === 2) {
    return (
      <>
        <path d="M-82,-12 C-76,-50 -40,-54 -26,-14 C-44,-6 -66,-6 -82,-12 Z" fill="url(#m-hill)" />
        <path d="M8,-16 C16,-62 62,-62 74,-14 C52,-5 28,-6 8,-16 Z" fill="url(#m-hill)" />
        <path d="M-72,-24 C-66,-42 -52,-46 -44,-38 C-56,-40 -66,-34 -72,-24 Z M20,-30 C28,-52 48,-56 58,-44 C44,-48 30,-42 20,-30 Z" fill="#ffffff" opacity="0.22" />
        <Pine x={-54} y={6} />
        <Pine x={60} y={8} s={0.92} />
        <Pine x={-70} y={18} s={0.74} />
        <circle cx="42" cy="22" r="7" fill="#2f9e53" />
      </>
    )
  }
  return (
    <>
      <path d="M-78,-14 C-72,-60 -26,-66 -12,-16 C-30,-5 -60,-5 -78,-14 Z" fill="url(#m-hill)" />
      <path d="M-66,-27 C-60,-49 -41,-55 -31,-44 C-45,-47 -58,-39 -66,-27 Z" fill="#ffffff" opacity="0.24" />
      <Palm x={54} y={-6} />
      <Palm x={72} y={12} s={0.8} flip />
      <circle cx="-38" cy="20" r="8" fill="#2f9e53" />
      <circle cx="-28" cy="24" r="6" fill="#49c96f" />
    </>
  )
}

// Where the conquest flag stands: on the highest point of each scenery set.
const FLAG_AT = [
  [-45, -55],
  [42, -78],
  [41, -49],
]

function Padlock() {
  return (
    <g transform="translate(0 -12)">
      <ellipse cx="2" cy="35" rx="25" ry="7" fill="#0b2a45" opacity="0.22" />
      <circle r="30" fill="url(#m-lock-ring)" />
      <circle r="24.5" fill="url(#m-lock-face)" />
      <path d="M-8,-3 V-9 a8,8 0 0 1 16,0 V-3" fill="none" stroke="#ffffff" strokeWidth="4.2" strokeLinecap="round" />
      <rect x="-11.5" y="-4" width="23" height="18" rx="4.5" fill="#ffffff" />
      <circle cy="3.5" r="2.8" fill="#566b83" />
      <rect x="-1.3" y="3.5" width="2.6" height="5.5" rx="1.2" fill="#566b83" />
      <path d="M-19,-11 A22,22 0 0 1 8,-20.5" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" opacity="0.4" />
    </g>
  )
}

// One island, drawn around (0,0) with a radius of about 100: shallow water and foam, a cliff,
// the beach, a raised lawn with scenery, and the topic's emoji standing on it as the landmark.
function IslandArt({ seed, icon, locked = false, conquered = false, here = false, color, bare = false }) {
  const variant = hash(seed) % 3
  const [fx, fy] = FLAG_AT[variant]
  const still = useContext(Still) || locked
  return (
    <Still.Provider value={still}>
      <path d={blobPath(`${seed}-shoal`, 0, 8, 160)} fill="url(#m-shoal)" />
      {here && !still && (
        <ellipse className="here-ring" cx="0" cy="10" rx="138" ry="104" opacity="0.9">
          <Move type="scale" values={[1, 1.5]} dur={2.6} />
          <Fade values={[0.9, 0]} dur={2.6} />
        </ellipse>
      )}
      <path d={blobPath(seed, 0, 8, 124)} fill="#c4f8ec" opacity="0.5" />
      <ellipse cx="10" cy="34" rx="126" ry="84" fill="url(#m-shade)" />
      <path className="foam" strokeWidth="2.5" strokeOpacity="0.5" d={blobPath(seed, 0, 10, 119)}>
        {here && <Move type="scale" values={[1, 1.035, 1]} dur={3.6} begin={-1.8} />}
        {here && <Fade attr="stroke-opacity" values={[0.5, 0.2, 0.5]} dur={3.6} begin={-1.8} />}
      </path>
      <path className="foam" strokeWidth="5" strokeOpacity="0.85" d={blobPath(seed, 0, 9, 109)}>
        {here && <Move type="scale" values={[1, 1.035, 1]} dur={3.6} />}
        {here && <Fade attr="stroke-opacity" values={[0.85, 0.35, 0.85]} dur={3.6} />}
      </path>
      <ellipse className="focus-ring" cx="0" cy="8" rx="132" ry="100" />
      <path d={blobPath(seed, 0, 14, 100)} fill="url(#m-cliff)" />
      <path d={blobPath(seed, 0, 0, 100)} fill="url(#m-sand)" />
      <path d={blobPath(seed, 0, 0, 100)} fill="none" stroke="#fffbe9" strokeWidth="2.5" opacity="0.7" />
      <path d={blobPath(`${seed}-lawn`, 0, -1, 75)} fill="#2a8f4b" />
      <path d={blobPath(`${seed}-lawn`, 0, -9, 75)} fill="url(#m-grass)" />
      <ellipse cx="-24" cy="-32" rx="40" ry="20" fill="#e2ffa6" opacity="0.3" />
      {!bare && <Scenery variant={variant} />}
      {bare && <Palm x={34} y={-8} s={1.1} />}
      <ellipse cx="-116" cy="54" rx="9" ry="5.5" fill="#8794a3" />
      <ellipse cx="-118" cy="52" rx="5" ry="2.6" fill="#c3ccd6" />
      <ellipse cx="118" cy="60" rx="7" ry="4.5" fill="#8794a3" />
      <ellipse cx="116.5" cy="58.5" rx="4" ry="2" fill="#c3ccd6" />
      {conquered && (
        <g>
          <path d={`M${fx},${fy + 4} V${fy - 44}`} stroke="#5f3613" strokeWidth="3.6" strokeLinecap="round" />
          <circle cx={fx} cy={fy - 46} r="3.2" fill="url(#m-gold)" />
          <g transform={`translate(${fx} ${fy - 42})`}>
            <g>
              <Move type="skewY" values={[-5, 5, -5]} dur={3.6} />
              <path d="M0,0 c10,-6 18,6 32,2 v20 c-14,4 -22,-8 -32,-2 Z" fill={color} />
              <path d="M17,1.5 c5,1.8 10,1.5 15,0.5 v20 c-5,1 -10,1.3 -15,-0.5 Z" fill="#0b2740" opacity="0.16" />
              <path d="M0,0 c10,-6 18,6 32,2" fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.5" />
            </g>
          </g>
        </g>
      )}
      {locked ? (
        <Padlock />
      ) : (
        <>
          <ellipse cx="2" cy="21" rx="30" ry="8" fill="#0b3a24" opacity="0.24" />
          <g>
            {here && <Move values={['0 0', '0 -6', '0 0']} dur={2.8} />}
            <text className="island-icon" x="0" y="-11" fontSize="60" textAnchor="middle" dominantBaseline="central">
              {icon}
            </text>
          </g>
        </>
      )}
      {locked && (
        <g>
          <ellipse cx="-62" cy="36" rx="74" ry="24" fill="url(#m-mist)" opacity="0.85" />
          <ellipse cx="68" cy="-46" rx="60" ry="20" fill="url(#m-mist)" opacity="0.8" />
          <ellipse cx="74" cy="46" rx="52" ry="17" fill="url(#m-mist)" opacity="0.65" />
        </g>
      )}
    </Still.Provider>
  )
}

// A small name plate. Used under islands, the harbor, the chest and My Island.
function Plate({ x, y, text, width, height = 26, children }) {
  const wd = width ?? Math.max(54, text.length * 7.6 + 22)
  return (
    <g>
      <rect x={x - wd / 2} y={y + 2.5} width={wd} height={height} rx={height / 2} fill="#062a52" opacity="0.28" />
      <rect className="plate" fill="url(#m-plate)" x={x - wd / 2} y={y} width={wd} height={height} rx={height / 2} />
      <text className="plate-text" x={x} y={y + height / 2 + 0.5} textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
      {children}
    </g>
  )
}

function Island({ topic, x, y, r, stats, locked, here, onClick }) {
  const t = useT()
  const done = stats.conquered
  const pct = Math.round(stats.progress * 100)
  const name = t(topic.name)
  const bannerW = Math.max(r * 2.1, name.length * 9.1 + (done ? 52 : 32))
  const top = y + r * 0.84
  return (
    <g
      className={`island ${locked ? 'is-locked' : ''} ${here ? 'is-here' : ''}`}
      style={{ '--topic': topic.color }}
      role="button"
      tabIndex={0}
      aria-label={locked ? t('{name}, locked', { name }) : done ? t('{name}, conquered', { name }) : t('{name}, {pct}% explored', { name, pct })}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
    >
      <g className="island-lift">
        <g className="isle-art" transform={`translate(${x} ${y}) scale(${r / 100})`}>
          <IslandArt seed={topic.id} icon={topic.icon} locked={locked} conquered={done} here={here} color={topic.color} />
        </g>
        {!locked && stats.due > 0 && (
          <g className="island-badge" transform={`translate(${x + r * 0.9} ${y - r * 0.7})`}>
            <circle cx="1" cy="2.5" r="15" fill="#062a52" opacity="0.3" />
            <circle r="14.5" fill="url(#m-badge)" stroke="#ffffff" strokeWidth="3" />
            <text textAnchor="middle" dominantBaseline="central" y="0.5">
              {stats.due}
            </text>
          </g>
        )}
        <g className="island-banner">
          <rect x={x - bannerW / 2} y={top + 3} width={bannerW} height={locked ? 30 : 40} rx="14" fill="#062a52" opacity="0.3" />
          <rect className="plate" fill="url(#m-plate)" x={x - bannerW / 2} y={top} width={bannerW} height={locked ? 30 : 40} rx="14" />
          {done && (
            <g transform={`translate(${x - bannerW / 2 + 17} ${top + 14.5})`}>
              <circle r="8.5" fill="url(#m-bar)" />
              <path d="M-4,0.3 L-1.2,3.2 L4.3,-2.8" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
          <text className="island-name" x={x + (done ? 10 : 0)} y={top + 15} textAnchor="middle" dominantBaseline="central">
            {name}
          </text>
          {!locked && (
            <>
              <rect className="island-bar-bg" x={x - bannerW / 2 + 14} y={top + 27.5} width={bannerW - 28} height={6} rx={3} />
              <rect
                className="island-bar"
                x={x - bannerW / 2 + 14}
                y={top + 27.5}
                width={Math.max(pct ? 6 : 0, ((bannerW - 28) * pct) / 100)}
                height={6}
                rx={3}
                fill={done ? 'url(#m-gold)' : 'url(#m-bar)'}
              />
            </>
          )}
        </g>
      </g>
    </g>
  )
}

function Boat({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <ellipse cx="3" cy="17" rx="32" ry="7" fill="#062a52" opacity="0.26" />
      <path className="wake" opacity="0.75" d="M-40,15 q7,-5 14,0 M24,15 q7,-5 14,0 M-30,21 q6,-4 12,0">
        <Fade values={[0.75, 0.25, 0.75]} dur={2.6} />
      </path>
      <g>
        <Move type="rotate" values={['-3 0 14', '3 0 14', '-3 0 14']} dur={3.2} />
        <path d="M-27,0 H27 L19,14 Q0,17 -19,14 Z" fill="url(#m-hull)" />
        <path d="M-29,-3.5 H29 L27,1.5 H-27 Z" fill="#f8dcae" />
        <path d="M-19,14 Q0,17 19,14 L20.5,11 Q0,14 -20.5,11 Z" fill="#5f1d0b" opacity="0.5" />
        <rect x="-1.6" y="-46" width="3.2" height="44" rx="1.5" fill="#6b3f1c" />
        <path d="M3.5,-43 Q33,-23 25,-6 H3.5 Z" fill="url(#m-sail)" />
        <path d="M-3.5,-39 Q-24,-21 -19,-6 H-3.5 Z" fill="#eef4fa" />
        <path d="M3.5,-43 Q16,-26 13,-6 H3.5 Z" fill="#ffffff" opacity="0.55" />
        <path d="M0,-46 l11,-4.5 l-11,-4.5 Z" fill="#ff5a4d" />
      </g>
    </g>
  )
}

function Harbor({ x, y, label }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="4" cy="22" rx="62" ry="13" fill="#062a52" opacity="0.24" />
      {/* lighthouse on its rock */}
      <ellipse cx="-34" cy="0" rx="22" ry="9" fill="#6f7d8c" />
      <ellipse cx="-36" cy="-3" rx="17" ry="6.5" fill="#aab6c3" />
      <path d="M-43,-4 L-40.5,-42 H-27.5 L-25,-4 Z" fill="#ffffff" />
      <path d="M-34,-42 H-27.5 L-25,-4 H-34 Z" fill="#0b2740" opacity="0.12" />
      <path d="M-42.3,-15 L-41.6,-26 H-26.4 L-25.7,-15 Z" fill="#ef4b4b" />
      <rect x="-42" y="-45" width="16" height="3.6" rx="1" fill="#44566b" />
      <circle cx="-34" cy="-50" r="15" fill="url(#m-glow)">
        <Fade attr="r" values={[15, 21, 15]} dur={2.4} />
        <Fade values={[1, 0.5, 1]} dur={2.4} />
      </circle>
      <rect x="-39.5" y="-54" width="11" height="9" rx="1" fill="#fff0a3" />
      <path d="M-42,-54 L-34,-62 L-26,-54 Z" fill="#d83a3a" />
      {/* pier */}
      <rect x="-12" y="9" width="5.5" height="15" rx="2" fill="url(#m-wood-dark)" />
      <rect x="22" y="9" width="5.5" height="15" rx="2" fill="url(#m-wood-dark)" />
      <rect x="52" y="9" width="5.5" height="15" rx="2" fill="url(#m-wood-dark)" />
      <rect x="-18" y="-7" width="82" height="19" rx="3.5" fill="url(#m-wood)" />
      <path d="M-4,-7 V12 M10,-7 V12 M24,-7 V12 M38,-7 V12 M52,-7 V12" stroke="#5f3613" strokeWidth="1.2" opacity="0.5" />
      <rect x="-18" y="-7" width="82" height="4" rx="2" fill="#ffffff" opacity="0.2" />
      <circle cx="-13" cy="-7" r="4" fill="url(#m-wood-dark)" />
      <circle cx="59" cy="-7" r="4" fill="url(#m-wood-dark)" />
      <Plate x={20} y={28} text={label} />
    </g>
  )
}

function Chest({ chest, x, y, label, readyText, onClick }) {
  return (
    <g
      className={`chest ${chest.ready ? 'is-ready' : ''}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
    >
      <path d={blobPath('chest-shoal', 0, 12, 66)} fill="url(#m-shoal)" />
      <ellipse className="focus-ring" cx="0" cy="12" rx="62" ry="44" />
      <ellipse cx="5" cy="28" rx="54" ry="30" fill="url(#m-shade)" />
      <path className="foam" strokeWidth="4" strokeOpacity="0.8" d={blobPath('chest', 0, 15, 45)} />
      <path d={blobPath('chest', 0, 18, 41)} fill="url(#m-cliff)" />
      <path d={blobPath('chest', 0, 11, 41)} fill="url(#m-sand)" />
      {chest.ready && (
        <circle cx="0" cy="0" r="46" fill="url(#m-glow)">
          <Fade attr="r" values={[46, 58, 46]} dur={1.6} />
          <Fade values={[0.95, 0.5, 0.95]} dur={1.6} />
        </circle>
      )}
      <g>
        {chest.ready && <Move values={['0 0', '0 -6', '0 0', '0 0']} keyTimes={[0, 0.3, 0.6, 1]} dur={1.6} />}
        <ellipse cx="2" cy="25" rx="29" ry="6.5" fill="#3d2a10" opacity="0.3" />
        <rect x="-25" y="-5" width="50" height="28" rx="4" fill="url(#m-wood)" />
        <path d="M-27,-5 Q-27,-29 0,-29 Q27,-29 27,-5 Z" fill="url(#m-wood-dark)" />
        <path d="M-22,-9 Q-21,-24 -4,-25.5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
        <rect x="-18" y="-28" width="6.5" height="51" rx="1.5" fill="url(#m-gold)" />
        <rect x="11.5" y="-28" width="6.5" height="51" rx="1.5" fill="url(#m-gold)" />
        <rect x="-27" y="-8" width="54" height="5.5" rx="1.5" fill="url(#m-gold)" />
        <rect x="-5.5" y="-6" width="11" height="12" rx="2.5" fill="#ffe27a" stroke="#b77c00" strokeWidth="1.2" />
        <circle cy="-1" r="1.8" fill="#7a5200" />
        <rect x="-0.9" y="-1" width="1.8" height="4" fill="#7a5200" />
      </g>
      <Plate x={0} y={38} text={chest.ready ? readyText : `${chest.conquered} / ${chest.total}`} width={chest.ready ? undefined : 74}>
        {!chest.ready && (
          <g transform="translate(22 44)">
            <path d="M0,0 V14" stroke="#5f3613" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M0.8,0 l9,3.5 l-9,3.5 Z" fill="#ff5a4d" />
          </g>
        )}
      </Plate>
    </g>
  )
}

function Compass({ x, y }) {
  return (
    <g className="compass" transform={`translate(${x} ${y})`} aria-hidden="true">
      <circle cx="1.5" cy="3" r="31" fill="#062a52" opacity="0.25" />
      <circle r="30" fill="#fff8e2" />
      <circle r="28" fill="none" stroke="url(#m-gold)" strokeWidth="4" />
      <circle r="21" fill="none" stroke="#16324f" strokeOpacity="0.18" strokeDasharray="1.5 4" />
      <path d="M-20,0 L0,-4.5 L20,0 L0,4.5 Z" fill="#a9b9cb" />
      <path d="M0,-22 L5,0 L0,22 L-5,0 Z" fill="#16324f" />
      <path d="M0,-22 L5,0 L-5,0 Z" fill="#ef4b4b" />
      <path d="M0,-22 L0,0 L-5,0 Z" fill="#ffffff" opacity="0.25" />
      <circle r="3" fill="url(#m-gold)" />
      <text y="-37" textAnchor="middle">
        N
      </text>
    </g>
  )
}

// Clouds and gulls float above the map on a layer of their own. Each is a small SVG placed in
// percent of the map, so it scales with it; CSS moves them (see .sky-cloud and .sky-gulls).
function Sky({ L }) {
  const pct = (v, of) => `${((v / of) * 100).toFixed(2)}%`
  return (
    <div className="map-sky" aria-hidden="true">
      {L.clouds.map(([x, y, s], i) => (
        <svg
          key={i}
          className={`sky-cloud ${i % 2 ? 'sky-cloud-back' : ''}`}
          viewBox="-10 0 190 160"
          style={{ left: pct(x - 10 * s, L.w), top: pct(y, L.h), width: pct(190 * s, L.w) }}
        >
          <ellipse cx="84" cy="124" rx="92" ry="30" fill="url(#m-shade)" opacity="0.6" />
          <path d="M14,52 a22,22 0 0,1 30,-28 a27,27 0 0,1 50,4 a19,19 0 0,1 14,36 q-2,4 -8,4 h-80 a17,17 0 0,1 -6,-16 Z" fill="url(#m-cloud)" opacity="0.94" />
          <path d="M30,30 a18,18 0 0,1 22,-9" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        </svg>
      ))}
      <svg
        className="sky-gulls"
        viewBox="-12 -10 44 30"
        style={{ left: pct(-80, L.w), top: pct(L.h * 0.3, L.h), width: pct(44, L.w), '--span': L.w + 170 }}
      >
        <path className="gull" d="M-9,0 q4.5,-7 9,0 q4.5,-7 9,0" />
        <path className="gull" d="M14,13 q3.5,-5.5 7,0 q3.5,-5.5 7,0" />
      </svg>
    </div>
  )
}

export default function IslandMap({ profile, onIsland, onChest, onCustom }) {
  const t = useT()
  const L = useLayout()
  const islands = useMemo(
    () =>
      profile.topics.map((id, i) => {
        const stats = islandState(profile, id, i)
        return { topic: topicById(id), pos: L.islands[i], stats, locked: !stats.unlocked }
      }),
    [profile, L],
  )
  const chest = chestProgress(profile)
  const customStats = topicStats(profile, CUSTOM_TOPIC.id)
  const lastOpen = islands.reduce((acc, isl, i) => (isl.locked ? acc : i), 0)
  // The island to play next: the first open one that is not conquered yet.
  const here = islands.findIndex((isl) => !isl.locked && !isl.stats.conquered)
  const route = [L.harbor, ...L.islands, L.chest]
  const traveled = route.slice(0, lastOpen + 2)
  // The boat waits at the island to play next. (Explorers from before island conquest can have
  // a later island open while an earlier one is not conquered yet.)
  const boat = L.islands[here >= 0 ? here : lastOpen]
  const customLabel = customStats.total ? `${t('My Island')} · ${customStats.total}` : `+ ${t('My words')}`
  const cr = L.r * 0.5
  const still = useMedia('(prefers-reduced-motion: reduce)')

  return (
    <div className="map-stack" style={{ aspectRatio: `${L.w} / ${L.h}`, '--units': L.w }}>
      <div className="map-waves map-waves-far" aria-hidden="true" />
      <div className="map-waves" aria-hidden="true" />
      <div className="map-vignette" aria-hidden="true" />
      <Glints w={L.w} h={L.h} />
    <svg className="map" viewBox={`0 0 ${L.w} ${L.h}`} role="group" aria-label={t('Your island map')}>
      <Still.Provider value={still}>
      <MapDefs />

      <g aria-hidden="true">
        <path className="route route-shadow" d={routePath(route)} transform="translate(0 3)" />
        <path className="route route-ahead" d={routePath(route.slice(lastOpen + 1))} />
        <path className="route route-done" d={routePath(traveled)} />
      </g>

      <Harbor x={L.harbor[0]} y={L.harbor[1]} label={t('Harbor')} />

      <g
        className="island custom-island"
        style={{ '--topic': CUSTOM_TOPIC.color }}
        role="button"
        tabIndex={0}
        aria-label={t('My Island, {n} words of your own', { n: customStats.total })}
        onClick={onCustom}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onCustom())}
      >
        <g className="island-lift">
          <g className="isle-art" transform={`translate(${L.custom[0]} ${L.custom[1]}) scale(${cr / 100})`}>
            <IslandArt seed="custom" icon={CUSTOM_TOPIC.icon} color={CUSTOM_TOPIC.color} bare />
          </g>
          <Plate x={L.custom[0]} y={L.custom[1] + cr * 0.92} text={customLabel} />
        </g>
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
          here={i === here}
          onClick={() => onIsland(isl.topic.id, i)}
        />
      ))}

      <Boat x={boat[0] - L.r * 1.42} y={boat[1] + L.r * 0.42} />

      <Chest
        chest={chest}
        x={L.chest[0]}
        y={L.chest[1]}
        label={
          chest.ready
            ? t('Treasure chest is ready to open')
            : t('Treasure chest: {n} of {total} islands conquered', { n: chest.conquered, total: chest.total })
        }
        readyText={t('Open me!')}
        onClick={onChest}
      />

      <Compass x={L.compass[0]} y={L.compass[1]} />
      </Still.Provider>
    </svg>
      <Sky L={L} />
    </div>
  )
}
