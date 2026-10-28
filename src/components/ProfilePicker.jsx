import { Avatar } from './Pickers.jsx'
import { liveStreak, rankInfo } from '../lib/storage.js'
import { levelName } from '../lib/srs.js'

export default function ProfilePicker({ profiles, onPick, onNew }) {
  return (
    <div className="screen sea-screen">
      <div className="welcome">
        <div className="logo" aria-hidden="true">
          <span className="logo-flag" />
        </div>
        <h1 className="title-xl">Word Adventure</h1>
        <p className="lead">
          {profiles.length ? "Who's exploring today?" : 'Sail between islands, collect words and learn to speak English with confidence.'}
        </p>

        <div className="profile-grid">
          {profiles.map((p) => {
            const streak = liveStreak(p)
            return (
              <button key={p.id} type="button" className="profile-card sticker" onClick={() => onPick(p.id)}>
                <Avatar avatar={p.avatar} color={p.color} size={72} />
                <span className="profile-name">{p.name}</span>
                <span className="chip">{levelName(p.level)}</span>
                <span className="profile-meta">
                  Rank {rankInfo(p.xp).rank} · {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
                </span>
              </button>
            )
          })}
          <button type="button" className="profile-card profile-new" onClick={onNew}>
            <span className="plus" aria-hidden="true">
              +
            </span>
            <span className="profile-name">{profiles.length ? 'New explorer' : 'Create your explorer'}</span>
            <span className="profile-meta">Pick a level and 5 islands</span>
          </button>
        </div>
      </div>
    </div>
  )
}
