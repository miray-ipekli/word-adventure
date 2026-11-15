import { useState } from 'react'
import { CUSTOM_TOPIC } from '../data/topics.js'
import { liveStreak, rankInfo, todayXp, totalXp } from '../lib/progress.js'
import { activeWords, dueCount, levelName, nextDueAt, nextLevel, starredWords, trickyWords } from '../lib/srs.js'
import { chestProgress } from '../lib/islands.js'
import { play } from '../lib/sound.js'
import { useT } from '../lib/i18n.js'
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

const SYNC_LABEL = { saved: 'Saved', saving: 'Saving…', offline: 'Offline · will sync', gone: 'Not saved · sign in again' }

function Hud({ profile, sound, sync, onSwitch, onSettings }) {
  const t = useT()
  const rank = rankInfo(totalXp(profile))
  const xpToday = todayXp(profile)
  const streak = liveStreak(profile)
  return (
    <header className="hud sticker">
      <button type="button" className="hud-who" onClick={onSwitch} title={t('Switch explorer')}>
        <Avatar avatar={profile.avatar} color={profile.color} size={44} />
        <span className="hud-name">
          <strong>{profile.name}</strong>
          <span className="chip chip-sm">{t(levelName(profile.level))}</span>
        </span>
      </button>
      <div className="hud-rank" title={t('{into} / {need} XP to the next rank', { into: rank.into, need: rank.need })}>
        <span className="hud-label">{t('Rank {n}', { n: rank.rank })}</span>
        <span className="xp-bar">
          <span style={{ width: `${(rank.into / rank.need) * 100}%` }} />
        </span>
      </div>
      <div className="hud-stats">
        <span className={`sync sync-${sync}`} title={t('Your progress is saved to the cloud')}>
          {t(SYNC_LABEL[sync])}
        </span>
        <span className={`hud-stat streak ${streak ? 'is-on' : ''}`} title={t('Days in a row')}>
          <span aria-hidden="true">🔥</span> {streak}
        </span>
        <span className="hud-stat" title={t('Daily goal')}>
          <GoalRing value={xpToday} goal={profile.dailyGoal} />
          <span className="tabular">
            {Math.min(xpToday, profile.dailyGoal)}/{profile.dailyGoal}
          </span>
        </span>
        <button type="button" className="icon-btn" onClick={sound.toggle} aria-label={sound.on ? t('Mute sounds') : t('Turn sounds on')}>
          {sound.on ? '🔊' : '🔈'}
        </button>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label={t('Settings')}>
          ⚙️
        </button>
        <button type="button" className="btn btn-small hud-signout" onClick={onSwitch} title={t('Back to the explorer list')}>
          <span aria-hidden="true">🚪</span> {t('Sign out')}
        </button>
      </div>
    </header>
  )
}

function formatWait(ms, t) {
  const min = Math.ceil(ms / 60000)
  if (min < 60) return t('{n} min', { n: min })
  const h = Math.round(min / 60)
  if (h < 24) return t('{n} h', { n: h })
  return t('{n} days', { n: Math.round(h / 24) })
}

export default function MapScreen(props) {
  const { profile, sound, sync, onStarred, onIsland, onReview, onTricky, onSpeak, onWords, onSettings, onSwitch, onLevelUp } = props
  const t = useT()
  const [chestOpen, setChestOpen] = useState(false)

  const due = dueCount(profile)
  const tricky = trickyWords(profile)
  const starred = starredWords(profile)
  const nextDue = nextDueAt(profile)
  const chest = chestProgress(profile)
  const upcoming = nextLevel(profile.level)

  const openIsland = (topicId, order) => {
    play('tap')
    onIsland(topicId, order)
  }

  return (
    <div className="screen map-screen">
      <Hud profile={profile} sound={sound} sync={sync} onSwitch={onSwitch} onSettings={onSettings} />

      <div className="map-layout">
        <section className="map-frame sticker" aria-label={t('Map')}>
          <IslandMap
            profile={profile}
            onIsland={openIsland}
            onCustom={() => (activeWords(profile, CUSTOM_TOPIC.id).length ? openIsland(CUSTOM_TOPIC.id, -1) : onWords())}
            onChest={() => setChestOpen(true)}
          />
        </section>

        <aside className="quests">
          <h2 className="quests-title">{t("Today's quests")}</h2>

          <article className={`quest sticker ${due ? 'quest-hot' : ''}`}>
            <div className="quest-head">
              <span className="quest-icon" aria-hidden="true">
                🧭
              </span>
              <div>
                <h3>{t('Daily review')}</h3>
                <p className="muted">
                  {due
                    ? t.plural(due, '{n} word is ready to review.', '{n} words are ready to review.')
                    : nextDue
                      ? t('All caught up. Next review in {wait}.', { wait: formatWait(nextDue - Date.now(), t) })
                      : t('Explore an island to collect your first words.')}
                </p>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-block" disabled={!due} onClick={onReview}>
              {due ? t.plural(due, 'Review {n} word', 'Review {n} words') : t('Nothing to review')}
            </button>
          </article>

          <article className="quest sticker quest-boss">
            <div className="quest-head">
              <span className="quest-icon" aria-hidden="true">
                🐙
              </span>
              <div>
                <h3>{t('Tricky words')}</h3>
                <p className="muted">
                  {tricky.length
                    ? t('Words you missed come back here until you beat them.')
                    : t('Miss a word and it joins the boss fight. None yet!')}
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
              {tricky.length ? t.plural(tricky.length, 'Fight {n} tricky word', 'Fight {n} tricky words') : t('No tricky words')}
            </button>
          </article>

          <article className="quest sticker quest-star">
            <div className="quest-head">
              <span className="quest-icon" aria-hidden="true">
                ⭐
              </span>
              <div>
                <h3>{t('Starred words')}</h3>
                <p className="muted">
                  {starred.length
                    ? t('Your chosen words. They also come back in every daily review.')
                    : t('Tap ☆ next to any word to keep practicing it, even when you know it.')}
                </p>
              </div>
            </div>
            {starred.length > 0 && (
              <ul className="word-chips">
                {starred.slice(0, 6).map((w) => (
                  <li key={w.id} className="word-chip is-starred">
                    {w.en}
                  </li>
                ))}
                {starred.length > 6 && <li className="word-chip">+{starred.length - 6}</li>}
              </ul>
            )}
            <div className="quest-actions">
              <button type="button" className="btn btn-star" disabled={!starred.length} onClick={onStarred}>
                {starred.length ? t('Practice {n} starred', { n: starred.length }) : t('No starred words')}
              </button>
              {starred.length > 0 && (
                <button type="button" className="btn btn-ghost btn-small" onClick={() => onWords('starred')}>
                  {t('See all')}
                </button>
              )}
            </div>
          </article>

          <div className="quest-row">
            <button type="button" className="quest quest-small sticker" onClick={onSpeak}>
              <span className="quest-icon" aria-hidden="true">
                🎙️
              </span>
              <span>
                <strong>Speak Studio</strong>
                <span className="muted">{t('Listen, repeat, get a score')}</span>
              </span>
            </button>
            <button type="button" className="quest quest-small sticker" onClick={() => onWords()}>
              <span className="quest-icon" aria-hidden="true">
                📒
              </span>
              <span>
                <strong>{t('My words')}</strong>
                <span className="muted">{t('Add words you heard today')}</span>
              </span>
            </button>
          </div>
        </aside>
      </div>

      {chestOpen && (
        <Modal onClose={() => setChestOpen(false)} label={t('Treasure chest')}>
          <div className="chest-dialog">
            <div className="big-icon" aria-hidden="true">
              {chest.ready ? '💎' : '🗝️'}
            </div>
            {chest.ready && upcoming ? (
              <>
                <h2 className="title-lg">{t('Treasure found!')}</h2>
                <p>
                  {t('You conquered all {n} islands at {level} level. You are ready for {next}. Your progress so far stays with you.', {
                    n: chest.total,
                    level: t(levelName(profile.level)),
                    next: t(upcoming.name),
                  })}
                </p>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setChestOpen(false)}>
                    {t('Stay a bit longer')}
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
                    {t('Go to {level}', { level: t(upcoming.name) })}
                  </button>
                </div>
              </>
            ) : chest.ready ? (
              <>
                <h2 className="title-lg">{t('You conquered every level!')}</h2>
                <p>{t('Keep your words fresh with daily reviews, add your own words and practice speaking.')}</p>
              </>
            ) : (
              <>
                <h2 className="title-lg">{t('The chest is locked')}</h2>
                <p>
                  {t('It opens when you have conquered all {n} islands. Islands conquered so far:', { n: chest.total })}{' '}
                  <strong>
                    {chest.conquered} / {chest.total}
                  </strong>
                  . {t('Each island ends with a castle: a role-play scene and a final exam.')}
                </p>
                <div className="meter">
                  <span style={{ width: `${chest.total ? (chest.conquered / chest.total) * 100 : 0}%` }} />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
