import { useState } from 'react'
import { CUSTOM_TOPIC, topicById } from '../data/topics.js'
import { liveStreak, rankInfo, todayXp } from '../lib/storage.js'
import {
  activeWords,
  chestProgress,
  dueCount,
  levelName,
  nextDueAt,
  nextLevel,
  statusOf,
  topicStats,
  trickyWords,
  unlockProgress,
  UNLOCK_NEED,
} from '../lib/srs.js'
import { play } from '../lib/sound.js'
import { Avatar } from './Pickers.jsx'
import IslandMap from './IslandMap.jsx'
import Modal from './Modal.jsx'

function GoalRing({ value, goal }) {
  const pct = Math.min(1, value / goal)
  const c = 2 * Math.PI * 16
  return (
    <svg className="goal-ring" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="16" className="goal-track" />
      <circle cx="20" cy="20" r="16" className="goal-fill" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 20 20)" />
    </svg>
  )
}

function Hud({ profile, sound, onSwitch, onSettings }) {
  const rank = rankInfo(profile.xp)
  const xpToday = todayXp(profile)
  const streak = liveStreak(profile)
  return (
    <header className="hud sticker">
      <button type="button" className="hud-who" onClick={onSwitch} title="Switch explorer">
        <Avatar avatar={profile.avatar} color={profile.color} size={44} />
        <span className="hud-name">
          <strong>{profile.name}</strong>
          <span className="chip chip-sm">{levelName(profile.level)}</span>
        </span>
      </button>
      <div className="hud-rank" title={`${rank.into} / ${rank.need} XP to the next rank`}>
        <span className="hud-label">Rank {rank.rank}</span>
        <span className="xp-bar">
          <span style={{ width: `${(rank.into / rank.need) * 100}%` }} />
        </span>
      </div>
      <div className="hud-stats">
        <span className={`hud-stat streak ${streak ? 'is-on' : ''}`} title="Days in a row">
          <span aria-hidden="true">🔥</span> {streak}
        </span>
        <span className="hud-stat" title="Daily goal">
          <GoalRing value={xpToday} goal={profile.dailyGoal} />
          <span className="tabular">
            {Math.min(xpToday, profile.dailyGoal)}/{profile.dailyGoal}
          </span>
        </span>
        <button type="button" className="icon-btn" onClick={sound.toggle} aria-label={sound.on ? 'Mute sounds' : 'Turn sounds on'}>
          {sound.on ? '🔊' : '🔈'}
        </button>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings">
          ⚙️
        </button>
      </div>
    </header>
  )
}

function formatWait(ms) {
  const min = Math.ceil(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  return `${Math.round(h / 24)} days`
}

export default function MapScreen(props) {
  const { profile, sound, onIsland, onReview, onTricky, onSpeak, onWords, onSettings, onSwitch, onLevelUp } = props
  const [sheet, setSheet] = useState(null)
  const [chestOpen, setChestOpen] = useState(false)

  const due = dueCount(profile)
  const tricky = trickyWords(profile)
  const nextDue = nextDueAt(profile)
  const chest = chestProgress(profile)
  const upcoming = nextLevel(profile.level)

  const openIsland = (topicId, order) => {
    play('tap')
    setSheet({ topicId, order })
  }

  return (
    <div className="screen map-screen">
      <Hud profile={profile} sound={sound} onSwitch={onSwitch} onSettings={onSettings} />

      <div className="map-layout">
        <section className="map-frame sticker" aria-label="Map">
          <IslandMap
            profile={profile}
            onIsland={openIsland}
            onCustom={() => (activeWords(profile, CUSTOM_TOPIC.id).length ? openIsland(CUSTOM_TOPIC.id, -1) : onWords())}
            onChest={() => setChestOpen(true)}
          />
        </section>

        <aside className="quests">
          <h2 className="quests-title">Today's quests</h2>

          <article className={`quest sticker ${due ? 'quest-hot' : ''}`}>
            <div className="quest-head">
              <span className="quest-icon" aria-hidden="true">
                🧭
              </span>
              <div>
                <h3>Daily review</h3>
                <p className="muted">
                  {due
                    ? `${due} word${due > 1 ? 's are' : ' is'} ready to review.`
                    : nextDue
                      ? `All caught up. Next review in ${formatWait(nextDue - Date.now())}.`
                      : 'Explore an island to collect your first words.'}
                </p>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-block" disabled={!due} onClick={onReview}>
              {due ? `Review ${due} word${due > 1 ? 's' : ''}` : 'Nothing to review'}
            </button>
          </article>

          <article className="quest sticker quest-boss">
            <div className="quest-head">
              <span className="quest-icon" aria-hidden="true">
                🐙
              </span>
              <div>
                <h3>Tricky words</h3>
                <p className="muted">
                  {tricky.length
                    ? 'Words you missed come back here until you beat them.'
                    : 'Miss a word and it joins the boss fight. None yet!'}
                </p>
              </div>
            </div>
            {tricky.length > 0 && (
              <ul className="word-chips">
                {tricky.slice(0, 6).map((w) => (
                  <li key={w.id} className="word-chip is-tricky">
                    {w.en}
                  </li>
                ))}
                {tricky.length > 6 && <li className="word-chip">+{tricky.length - 6}</li>}
              </ul>
            )}
            <button type="button" className="btn btn-boss btn-block" disabled={!tricky.length} onClick={onTricky}>
              {tricky.length ? `Fight ${tricky.length} tricky word${tricky.length > 1 ? 's' : ''}` : 'No tricky words'}
            </button>
          </article>

          <div className="quest-row">
            <button type="button" className="quest quest-small sticker" onClick={onSpeak}>
              <span className="quest-icon" aria-hidden="true">
                🎙️
              </span>
              <span>
                <strong>Speak Studio</strong>
                <span className="muted">Listen, repeat, get a score</span>
              </span>
            </button>
            <button type="button" className="quest quest-small sticker" onClick={onWords}>
              <span className="quest-icon" aria-hidden="true">
                📒
              </span>
              <span>
                <strong>My words</strong>
                <span className="muted">Add words you heard today</span>
              </span>
            </button>
          </div>
        </aside>
      </div>

      {sheet && (
        <IslandSheet
          profile={profile}
          {...sheet}
          onClose={() => setSheet(null)}
          onStart={() => {
            setSheet(null)
            onIsland(sheet.topicId)
          }}
        />
      )}

      {chestOpen && (
        <Modal onClose={() => setChestOpen(false)} label="Treasure chest">
          <div className="chest-dialog">
            <div className="big-icon" aria-hidden="true">
              {chest.ready ? '💎' : '🗝️'}
            </div>
            {chest.ready && upcoming ? (
              <>
                <h2 className="title-lg">Treasure found!</h2>
                <p>
                  {chest.strong} of {chest.total} {levelName(profile.level)} words are strong. You are ready for{' '}
                  <strong>{upcoming.name}</strong>. Your progress so far stays with you.
                </p>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setChestOpen(false)}>
                    Stay a bit longer
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      play('fanfare')
                      onLevelUp(upcoming.id)
                      setChestOpen(false)
                    }}
                  >
                    Go to {upcoming.name}
                  </button>
                </div>
              </>
            ) : chest.ready ? (
              <>
                <h2 className="title-lg">You conquered every level!</h2>
                <p>Keep your words fresh with daily reviews, add your own words and practice speaking.</p>
              </>
            ) : (
              <>
                <h2 className="title-lg">The chest is locked</h2>
                <p>
                  It opens when 80% of your {levelName(profile.level)} words are strong. Right now:{' '}
                  <strong>
                    {chest.strong} / {chest.total}
                  </strong>
                  . A word becomes strong after you answer it correctly on several different days.
                </p>
                <div className="meter">
                  <span style={{ width: `${chest.total ? (chest.strong / chest.total) * 100 : 0}%` }} />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

const STATUS_LABEL = { new: 'New', learning: 'Learning', tricky: 'Tricky', mastered: 'Mastered' }

function IslandSheet({ profile, topicId, order, onClose, onStart }) {
  const topic = topicById(topicId)
  const stats = topicStats(profile, topicId)
  const words = activeWords(profile, topicId)
  const unlock = order >= 0 ? unlockProgress(profile, order) : { unlocked: true }
  const prevTopic = order > 0 ? topicById(profile.topics[order - 1]) : null
  const action = stats.due || stats.new ? 'Explore island' : 'Extra practice'

  return (
    <Modal onClose={onClose} label={topic.name}>
      <div className="sheet" style={{ '--topic': topic.color }}>
        <div className="sheet-head">
          <span className="sheet-icon" aria-hidden="true">
            {unlock.unlocked ? topic.icon : '🔒'}
          </span>
          <div>
            <h2 className="title-lg">{topic.name}</h2>
            <p className="muted">
              {levelName(profile.level)} · {stats.total} words
            </p>
          </div>
        </div>

        {!unlock.unlocked ? (
          <p className="locked-note">
            Answer {UNLOCK_NEED} words correctly on <strong>{prevTopic.name}</strong> to open this island.{' '}
            <span className="tabular">
              ({unlock.have}/{UNLOCK_NEED})
            </span>
          </p>
        ) : (
          <>
            <div className="stat-row">
              {['new', 'learning', 'tricky', 'mastered'].map((k) => (
                <div key={k} className={`stat stat-${k}`}>
                  <strong className="tabular">{stats[k]}</strong>
                  <span>{STATUS_LABEL[k]}</span>
                </div>
              ))}
            </div>
            <ul className="word-chips">
              {words.map((w) => {
                const s = statusOf(profile.cards[w.id])
                return (
                  <li key={w.id} className={`word-chip is-${s}`} title={s === 'new' ? 'Not discovered yet' : w.tr}>
                    {s === 'new' ? '???' : w.en}
                  </li>
                )
              })}
            </ul>
            {stats.due > 0 && <p className="muted">{stats.due} word(s) here are due for review.</p>}
            {!stats.due && !stats.new && (
              <p className="muted">Every word here is scheduled. Extra practice earns XP without changing your schedule.</p>
            )}
          </>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          {unlock.unlocked && (
            <button type="button" className="btn btn-primary" disabled={!stats.total} onClick={onStart}>
              {action}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
