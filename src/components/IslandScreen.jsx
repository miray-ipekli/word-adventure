import { CUSTOM_TOPIC, topicById } from '../data/topics.js'
import { activeWords, levelName, STRONG_BOX } from '../lib/srs.js'
import { CAVE_NEED, islandState, passMark } from '../lib/islands.js'
import { useT } from '../lib/i18n.js'

function strength(box) {
  if (!box) return 'new'
  if (box >= STRONG_BOX) return 'strong'
  if (box >= 3) return 'growing'
  return 'learning'
}

function Station({ icon, name, status, detail, children, tone }) {
  return (
    <li className={`station sticker station-${tone}`}>
      <span className="station-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="station-body">
        <div className="station-head">
          <h3>{name}</h3>
          <span className={`pill pill-station-${tone}`}>{status}</span>
        </div>
        <p className="muted">{detail}</p>
        {children && <div className="station-actions">{children}</div>}
      </div>
    </li>
  )
}

export default function IslandScreen({ profile, topicId, onPlay, onStory, onRolePlay, onExam, onBack }) {
  const t = useT()
  const topic = topicById(topicId)
  const order = profile.topics.indexOf(topicId)
  const s = islandState(profile, topicId, order)
  const items = activeWords(profile, topicId)
  const custom = topicId === CUSTOM_TOPIC.id
  const totalItems = s.words.total + s.phrases.total
  const strongItems = s.words.strong + s.phrases.strong
  const practiceLabel = s.due || s.fresh ? t('Play · {due} to review, {fresh} new', { due: s.due, fresh: s.fresh }) : t('Extra practice')
  const days = (n) => (n <= 1 ? t('tomorrow') : t('in {n} days', { n }))

  // The one thing worth doing next, shown at the top.
  let next
  if (!s.unlocked) next = { text: t('Conquer {name} first to sail here.', { name: t(topicById(s.previous)?.name ?? '') }) }
  else if (s.castleOpen && !s.conquered && !s.roleplayDone) next = { text: t('The castle gates are open!'), label: t('Start the role-play'), action: onRolePlay }
  else if (s.castleOpen && !s.conquered && !s.examBlocked) next = { text: t('One last challenge.'), label: t('Take the final exam'), action: onExam }
  else if (s.towerOpen && !s.storyDone) next = { text: t('A story is waiting in the tower.'), label: t('Read the story'), action: onStory }
  else if (s.due || s.fresh) next = { text: t('{due} to review and {fresh} new today.', { due: s.due, fresh: s.fresh }), label: t('Play now'), action: onPlay }
  else if (s.conquered) next = { text: t('You conquered this island. Reviews keep your words fresh.'), label: t('Extra practice'), action: onPlay }
  else if (s.examBlocked) next = { text: t('The castle held today. Practice your tricky words and try again tomorrow.') }
  else next = { text: t('Your words are resting until their next review. Sleep helps them settle in.'), label: t('Extra practice'), action: onPlay }

  return (
    <div className="screen page-screen island-screen" style={{ '--topic': topic.color }}>
      <header className="page-top">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('Back to the map')}>
          ←
        </button>
        <h1 className="title-lg">
          {t(topic.name)} {s.conquered && <span aria-label={t('conquered')}>🚩</span>}
        </h1>
        <span className="chip">{t(levelName(profile.level))}</span>
      </header>

      <div className="island-layout">
        <section className="island-hero sticker">
          <div className="island-art" aria-hidden="true">
            <span>{s.unlocked ? topic.icon : '🔒'}</span>
          </div>
          <div className="island-summary">
            <p className="island-next">{next.text}</p>
            {next.action && (
              <button type="button" className="btn btn-primary" onClick={next.action}>
                {next.label}
              </button>
            )}
            {!custom && s.unlocked && (
              <div className="meter" aria-label={t('{n} of {total} strong', { n: strongItems, total: totalItems })}>
                <span style={{ width: `${totalItems ? (strongItems / totalItems) * 100 : 0}%` }} />
              </div>
            )}
            {!custom && s.unlocked && (
              <p className="muted tabular">
                {t('{n}/{total} words and phrases strong', { n: strongItems, total: totalItems })}
                {!s.conquered && s.etaDays > 0 && ` · ${t('castle {when} at the earliest', { when: days(s.etaDays) })}`}
              </p>
            )}
          </div>
        </section>

        {s.unlocked && (
          <ol className="stations" aria-label={t('Stations')}>
            {!custom && (
              <Station
                icon="🏰"
                name={t('Castle')}
                tone={s.conquered ? 'done' : s.castleOpen ? 'open' : 'locked'}
                status={s.conquered ? t('Conquered') : s.castleOpen ? t('Open') : t('Locked')}
                detail={
                  s.conquered
                    ? t('Your flag flies here. Replay the scene or the exam any time.')
                    : !s.castleOpen
                      ? strongItems < totalItems
                        ? t('Every word and phrase must be strong: recalled right on three different days ({n}/{total}).', {
                            n: strongItems,
                            total: totalItems,
                          })
                        : t('Finish the Story Tower to open the gates.')
                      : t('Act out the scene, then pass the exam with {pct}%.', { pct: Math.round(passMark(profile.level) * 100) })
                }
              >
                {(s.castleOpen || s.conquered) && (
                  <>
                    <button type="button" className="btn btn-small" onClick={onRolePlay}>
                      {s.roleplayDone ? `✓ ${t('Role-play')}` : `1 · ${t('Role-play')}`}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-primary"
                      onClick={onExam}
                      disabled={!s.roleplayDone || (s.examBlocked && !s.conquered)}
                    >
                      {s.examBlocked && !s.conquered ? t('Exam · try tomorrow') : s.conquered ? t('Retake exam') : `2 · ${t('Final exam')}`}
                    </button>
                  </>
                )}
              </Station>
            )}
            {!custom && (
              <Station
                icon="📖"
                name={t('Story Tower')}
                tone={s.storyDone ? 'done' : s.towerOpen ? 'open' : 'locked'}
                status={s.storyDone ? t('Done') : s.towerOpen ? t('Open') : t('Locked')}
                detail={
                  s.towerOpen
                    ? t('Read and listen to a story with your words, answer questions and build sentences.')
                    : t('Opens when you have met every word and phrase ({n}/{total}).', { n: s.words.seen + s.phrases.seen, total: totalItems })
                }
              >
                {s.towerOpen && (
                  <button type="button" className="btn btn-small" onClick={onStory}>
                    {s.storyDone ? t('Read again') : t('Read the story')}
                  </button>
                )}
              </Station>
            )}
            {!custom && (
              <Station
                icon="🧩"
                name={t('Phrase Cave')}
                tone={s.phrases.strong === s.phrases.total ? 'done' : s.caveOpen ? 'open' : 'locked'}
                status={s.caveOpen ? t('{n}/{total} strong', { n: s.phrases.strong, total: s.phrases.total }) : t('Locked')}
                detail={
                  s.caveOpen
                    ? t('Useful chunks of English. They come up in your play sessions.')
                    : t('Opens when {need} words were recalled on two different days ({n}/{need}).', {
                        need: CAVE_NEED,
                        n: Math.min(s.words.cave, CAVE_NEED),
                      })
                }
              />
            )}
            <Station
              icon="🏕️"
              name={custom ? t('My words') : t('Word Camp')}
              tone={s.words.strong === s.words.total ? 'done' : 'open'}
              status={t('{n}/{total} strong', { n: s.words.strong, total: s.words.total })}
              detail={t('New words and reviews. A word is strong once you recall it right on three different days.')}
            >
              <button type="button" className="btn btn-small btn-primary" onClick={onPlay}>
                {practiceLabel}
              </button>
            </Station>
          </ol>
        )}
      </div>

      {s.unlocked && (
        <section className="panel sticker">
          <h2 className="title-md">{t('Words and phrases')}</h2>
          <ul className="word-chips">
            {items.map((w) => {
              const box = profile.cards[w.id]?.box ?? 0
              const st = strength(box)
              const hidden = !box || (w.kind === 'phrase' && !s.caveOpen)
              return (
                <li key={w.id} className={`word-chip strength-${st}`} title={hidden ? t('Not discovered yet') : t('{tr} · level {n}', { tr: w.tr, n: box })}>
                  {hidden ? (w.kind === 'phrase' ? '🧩 ???' : '???') : w.en}
                </li>
              )
            })}
          </ul>
          <p className="muted legend">
            <span className="word-chip strength-learning">{t('learning')}</span> <span className="word-chip strength-growing">{t('growing')}</span>{' '}
            <span className="word-chip strength-strong">{t('strong')}</span>
          </p>
        </section>
      )}
    </div>
  )
}
