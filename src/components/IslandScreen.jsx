import { CUSTOM_TOPIC, topicById } from '../data/topics.js'
import { activeWords, levelName, STRONG_BOX } from '../lib/srs.js'
import { CAVE_NEED, islandState, passMark } from '../lib/islands.js'

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

const days = (n) => (n <= 1 ? 'tomorrow' : `in ${n} days`)

export default function IslandScreen({ profile, topicId, onPlay, onStory, onRolePlay, onExam, onBack }) {
  const topic = topicById(topicId)
  const order = profile.topics.indexOf(topicId)
  const s = islandState(profile, topicId, order)
  const items = activeWords(profile, topicId)
  const custom = topicId === CUSTOM_TOPIC.id
  const totalItems = s.words.total + s.phrases.total
  const strongItems = s.words.strong + s.phrases.strong
  const practiceLabel = s.due || s.fresh ? `Play · ${s.due} to review, ${s.fresh} new` : 'Extra practice'

  // The one thing worth doing next, shown at the top.
  let next
  if (!s.unlocked) next = { text: `Conquer ${topicById(s.previous)?.name} first to sail here.` }
  else if (s.castleOpen && !s.conquered && !s.roleplayDone) next = { text: 'The castle gates are open!', label: 'Start the role-play', action: onRolePlay }
  else if (s.castleOpen && !s.conquered && !s.examBlocked) next = { text: 'One last challenge.', label: 'Take the final exam', action: onExam }
  else if (s.towerOpen && !s.storyDone) next = { text: 'A story is waiting in the tower.', label: 'Read the story', action: onStory }
  else if (s.due || s.fresh) next = { text: `${s.due} to review and ${s.fresh} new today.`, label: 'Play now', action: onPlay }
  else if (s.conquered) next = { text: 'You conquered this island. Reviews keep your words fresh.', label: 'Extra practice', action: onPlay }
  else if (s.examBlocked) next = { text: 'The castle held today. Practice your tricky words and try again tomorrow.' }
  else next = { text: 'Your words are resting until their next review. Sleep helps them settle in.', label: 'Extra practice', action: onPlay }

  return (
    <div className="screen page-screen island-screen" style={{ '--topic': topic.color }}>
      <header className="page-top">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to the map">
          ←
        </button>
        <h1 className="title-lg">
          {topic.name} {s.conquered && <span aria-label="conquered">🚩</span>}
        </h1>
        <span className="chip">{levelName(profile.level)}</span>
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
              <div className="meter" aria-label={`${strongItems} of ${totalItems} strong`}>
                <span style={{ width: `${totalItems ? (strongItems / totalItems) * 100 : 0}%` }} />
              </div>
            )}
            {!custom && s.unlocked && (
              <p className="muted tabular">
                {strongItems}/{totalItems} words and phrases strong
                {!s.conquered && s.etaDays > 0 && ` · castle ${days(s.etaDays)} at the earliest`}
              </p>
            )}
          </div>
        </section>

        {s.unlocked && (
          <ol className="stations" aria-label="Stations">
            {!custom && (
              <Station
                icon="🏰"
                name="Castle"
                tone={s.conquered ? 'done' : s.castleOpen ? 'open' : 'locked'}
                status={s.conquered ? 'Conquered' : s.castleOpen ? 'Open' : 'Locked'}
                detail={
                  s.conquered
                    ? 'Your flag flies here. Replay the scene or the exam any time.'
                    : !s.castleOpen
                      ? strongItems < totalItems
                        ? `Every word and phrase must be strong: recalled right on three different days (${strongItems}/${totalItems}).`
                        : 'Finish the Story Tower to open the gates.'
                      : `Act out the scene, then pass the exam with ${Math.round(passMark(profile.level) * 100)}%.`
                }
              >
                {(s.castleOpen || s.conquered) && (
                  <>
                    <button type="button" className="btn btn-small" onClick={onRolePlay}>
                      {s.roleplayDone ? '✓ Role-play' : '1 · Role-play'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-primary"
                      onClick={onExam}
                      disabled={!s.roleplayDone || (s.examBlocked && !s.conquered)}
                    >
                      {s.examBlocked && !s.conquered ? 'Exam · try tomorrow' : s.conquered ? 'Retake exam' : '2 · Final exam'}
                    </button>
                  </>
                )}
              </Station>
            )}
            {!custom && (
              <Station
                icon="📖"
                name="Story Tower"
                tone={s.storyDone ? 'done' : s.towerOpen ? 'open' : 'locked'}
                status={s.storyDone ? 'Done' : s.towerOpen ? 'Open' : 'Locked'}
                detail={
                  s.towerOpen
                    ? 'Read and listen to a story with your words, answer questions and build sentences.'
                    : `Opens when you have met every word and phrase (${s.words.seen + s.phrases.seen}/${totalItems}).`
                }
              >
                {s.towerOpen && (
                  <button type="button" className="btn btn-small" onClick={onStory}>
                    {s.storyDone ? 'Read again' : 'Read the story'}
                  </button>
                )}
              </Station>
            )}
            {!custom && (
              <Station
                icon="🧩"
                name="Phrase Cave"
                tone={s.phrases.strong === s.phrases.total ? 'done' : s.caveOpen ? 'open' : 'locked'}
                status={s.caveOpen ? `${s.phrases.strong}/${s.phrases.total} strong` : 'Locked'}
                detail={
                  s.caveOpen
                    ? 'Useful chunks of English. They come up in your play sessions.'
                    : `Opens when ${CAVE_NEED} words were recalled on two different days (${Math.min(s.words.cave, CAVE_NEED)}/${CAVE_NEED}).`
                }
              />
            )}
            <Station
              icon="🏕️"
              name={custom ? 'My words' : 'Word Camp'}
              tone={s.words.strong === s.words.total ? 'done' : 'open'}
              status={`${s.words.strong}/${s.words.total} strong`}
              detail="New words and reviews. A word is strong once you recall it right on three different days."
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
          <h2 className="title-md">Words and phrases</h2>
          <ul className="word-chips">
            {items.map((w) => {
              const box = profile.cards[w.id]?.box ?? 0
              const st = strength(box)
              const hidden = !box || (w.kind === 'phrase' && !s.caveOpen)
              return (
                <li key={w.id} className={`word-chip strength-${st}`} title={hidden ? 'Not discovered yet' : `${w.tr} · level ${box}`}>
                  {hidden ? (w.kind === 'phrase' ? '🧩 ???' : '???') : w.en}
                </li>
              )
            })}
          </ul>
          <p className="muted legend">
            <span className="word-chip strength-learning">learning</span> <span className="word-chip strength-growing">growing</span>{' '}
            <span className="word-chip strength-strong">strong</span>
          </p>
        </section>
      )}
    </div>
  )
}
