import { useEffect, useState } from 'react'
import { loadStore, saveStore, newProfile, awardXp } from './lib/storage.js'
import { applyAnswer, buildSession, discoverCard, focusCard } from './lib/srs.js'
import { caps } from './lib/speech.js'
import { setSoundEnabled } from './lib/sound.js'
import ProfilePicker from './components/ProfilePicker.jsx'
import Onboarding from './components/Onboarding.jsx'
import MapScreen from './components/MapScreen.jsx'
import Session from './components/Session.jsx'
import SpeakStudio from './components/SpeakStudio.jsx'
import MyWords from './components/MyWords.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  const [store, setStore] = useState(loadStore)
  const [screen, setScreen] = useState(() => (loadStore().activeId ? 'map' : 'profiles'))
  const [session, setSession] = useState(null)

  useEffect(() => saveStore(store), [store])
  useEffect(() => setSoundEnabled(store.sound), [store.sound])

  const profile = store.profiles.find((p) => p.id === store.activeId) ?? null
  useEffect(() => {
    if (!profile && !['profiles', 'onboarding'].includes(screen)) setScreen('profiles')
  }, [profile, screen])

  const updateProfile = (fn) =>
    setStore((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === s.activeId ? fn(p) : p)) }))

  const setCard = (wordId, fn) => updateProfile((p) => ({ ...p, cards: { ...p.cards, [wordId]: fn(p.cards[wordId]) } }))

  const startSession = (opts) => {
    const steps = buildSession(profile, { ...opts, caps })
    setSession({ ...opts, steps, key: Date.now() })
    setScreen('session')
  }

  const actions = {
    answer: (wordId, correct) => setCard(wordId, (c) => applyAnswer(c, correct)),
    discover: (wordId, known) => setCard(wordId, () => discoverCard(known)),
    focus: (wordId) => setCard(wordId, (c) => focusCard(c)),
    xp: (amount) => amount > 0 && updateProfile((p) => awardXp(p, amount)),
  }

  const goMap = () => {
    setSession(null)
    setScreen('map')
  }

  if (screen === 'onboarding') {
    return (
      <Onboarding
        canCancel={store.profiles.length > 0}
        onCancel={() => setScreen('profiles')}
        onDone={(data) => {
          const p = newProfile(data)
          setStore((s) => ({ ...s, profiles: [...s.profiles, p], activeId: p.id }))
          setScreen('map')
        }}
      />
    )
  }

  if (screen === 'profiles' || !profile) {
    return (
      <ProfilePicker
        profiles={store.profiles}
        onPick={(id) => {
          setStore((s) => ({ ...s, activeId: id }))
          setScreen('map')
        }}
        onNew={() => setScreen('onboarding')}
      />
    )
  }

  const soundToggle = { on: store.sound, toggle: () => setStore((s) => ({ ...s, sound: !s.sound })) }

  switch (screen) {
    case 'session':
      return (
        <Session
          key={session.key}
          profile={profile}
          steps={session.steps}
          mode={session.mode}
          topicId={session.topicId}
          actions={actions}
          onExit={goMap}
        />
      )
    case 'speak':
      return <SpeakStudio profile={profile} actions={actions} onExit={goMap} />
    case 'words':
      return (
        <MyWords
          profile={profile}
          actions={actions}
          onAdd={(word) => updateProfile((p) => ({ ...p, custom: [...p.custom, word] }))}
          onRemove={(id) =>
            updateProfile((p) => {
              const cards = { ...p.cards }
              delete cards[id]
              return { ...p, custom: p.custom.filter((w) => w.id !== id), cards }
            })
          }
          onPractice={() => startSession({ mode: 'tricky' })}
          onExit={goMap}
        />
      )
    case 'settings':
      return (
        <Settings
          profile={profile}
          onSave={(changes) => {
            updateProfile((p) => ({ ...p, ...changes }))
            setScreen('map')
          }}
          onDelete={() => {
            setStore((s) => ({ ...s, profiles: s.profiles.filter((p) => p.id !== s.activeId), activeId: null }))
            setScreen('profiles')
          }}
          onExit={goMap}
        />
      )
    default:
      return (
        <MapScreen
          profile={profile}
          sound={soundToggle}
          onIsland={(topicId) => startSession({ mode: 'island', topicId })}
          onReview={() => startSession({ mode: 'review' })}
          onTricky={() => startSession({ mode: 'tricky' })}
          onSpeak={() => setScreen('speak')}
          onWords={() => setScreen('words')}
          onSettings={() => setScreen('settings')}
          onLevelUp={(level) => updateProfile((p) => ({ ...p, level }))}
          onSwitch={() => {
            setStore((s) => ({ ...s, activeId: null }))
            setScreen('profiles')
          }}
        />
      )
  }
}
