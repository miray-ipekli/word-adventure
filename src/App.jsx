import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadCache,
  loadPrefs,
  loadPublicCache,
  loadSession,
  saveCache,
  savePrefs,
  savePublicCache,
  saveSession,
} from './lib/storage.js'
import { awardXp, mergeProgress, newProgress } from './lib/progress.js'
import { changePin, createProfile, deleteProfile, keyFor, newProfileId, saveProgress, unlock, watchProfiles } from './lib/cloud.js'
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

const SAVE_DELAY = 1500
const OFFLINE_MSG = "Couldn't reach the cloud. Check your internet connection and try again."

function startState() {
  const session = loadSession()
  const cached = session ? loadCache(session.id) : null
  return session && cached?.key === session.key ? { session, profile: cached.data } : { session: null, profile: null }
}

export default function App() {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [start] = useState(startState)
  const [session, setSession] = useState(start.session)
  const [profile, setProfile] = useState(start.profile)
  const [screen, setScreen] = useState(start.profile ? 'map' : 'profiles')
  const [run, setRun] = useState(null)
  const [explorers, setExplorers] = useState(loadPublicCache)
  const [listStatus, setListStatus] = useState('loading')
  const [sync, setSync] = useState('saved')
  const [creating, setCreating] = useState({ busy: false, error: '' })

  useEffect(() => savePrefs(prefs), [prefs])
  useEffect(() => setSoundEnabled(prefs.sound), [prefs.sound])

  // ---- The shared explorer list ----
  useEffect(() => {
    const slow = setTimeout(() => setListStatus((s) => (s === 'loading' ? 'offline' : s)), 8000)
    const stop = watchProfiles(
      (list) => {
        setExplorers(list)
        savePublicCache(list)
        setListStatus('ok')
      },
      () => setListStatus('offline'),
    )
    return () => {
      clearTimeout(slow)
      stop()
    }
  }, [])

  // ---- Saving: local copy right away, cloud copy shortly after the last change ----
  const latest = useRef({ profile, key: session?.key })
  const stopped = useRef(false)
  if (!stopped.current) latest.current = { profile, key: session?.key }
  const changes = useRef(0)
  const timer = useRef(null)
  const inflight = useRef(null)

  // Returns a promise that settles when the cloud copy is up to date (or the save failed).
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (inflight.current) return inflight.current
    const { profile: p, key } = latest.current
    if (!p || !key) return Promise.resolve()
    const sent = changes.current
    setSync('saving')
    inflight.current = saveProgress(key, p)
      .then(
        (merged) => {
          // Keep anything played while the save was on its way.
          setProfile((cur) => (cur && cur.id === merged.id ? mergeProgress(cur, merged) : cur))
          if (changes.current === sent) changes.current = 0
          setSync(changes.current ? 'saving' : 'saved')
        },
        () => setSync('offline'),
      )
      .finally(() => {
        inflight.current = null
        if (changes.current && latest.current.key) timer.current = setTimeout(flush, SAVE_DELAY)
      })
    return inflight.current
  }, [])

  // Finishes any save on its way, then stops syncing the current explorer.
  const stopSync = async () => {
    await flush()
    clearTimeout(timer.current)
    changes.current = 0
    stopped.current = true
    latest.current = { profile: null, key: null }
  }

  useEffect(() => {
    if (profile && session) saveCache(profile.id, { key: session.key, data: profile, pending: changes.current > 0 })
  }, [profile, session])

  useEffect(() => {
    // Sync when the game opens, is hidden or shown again, or comes back online. Each sync
    // also pulls in whatever other devices saved.
    window.addEventListener('online', flush)
    window.addEventListener('focus', flush)
    document.addEventListener('visibilitychange', flush)
    if (latest.current.profile) flush()
    return () => {
      window.removeEventListener('online', flush)
      window.removeEventListener('focus', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [flush])

  const updateProfile = (fn) => {
    setProfile((p) => (p ? fn(p) : p))
    changes.current += 1
    setSync('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY)
  }
  const setCard = (wordId, fn) => updateProfile((p) => ({ ...p, cards: { ...p.cards, [wordId]: fn(p.cards[wordId]) } }))
  const changeSettings = (changes) => updateProfile((p) => ({ ...p, ...changes, settingsAt: Date.now() }))

  // ---- Signing in and out ----
  const open = (id, key, data) => {
    const s = { id, key }
    saveSession(s)
    saveCache(id, { key, data, pending: false })
    stopped.current = false
    latest.current = { profile: data, key }
    setSession(s)
    setProfile(data)
    setScreen('map')
    flush()
  }

  const signIn = async (id, pin) => {
    const key = await keyFor(id, pin)
    const cached = loadCache(id)
    let remote
    try {
      remote = await unlock(id, key)
    } catch {
      // Offline: a device that played this explorer before can still check the PIN itself.
      if (cached?.key === key) {
        open(id, key, cached.data)
        return 'ok'
      }
      return 'offline'
    }
    if (!remote) return 'wrong'
    open(id, key, cached?.key === key ? mergeProgress(cached.data, remote) : remote)
    return 'ok'
  }

  const signOut = async () => {
    await stopSync()
    saveSession(null)
    setSession(null)
    setProfile(null)
    setRun(null)
    setScreen('profiles')
  }

  const createExplorer = async ({ pin, ...form }) => {
    setCreating({ busy: true, error: '' })
    try {
      const p = newProgress({ id: newProfileId(), ...form })
      const key = await createProfile(p, pin)
      setCreating({ busy: false, error: '' })
      open(p.id, key, p)
    } catch {
      setCreating({ busy: false, error: OFFLINE_MSG })
    }
  }

  const startRun = (opts) => {
    setRun({ ...opts, steps: buildSession(profile, { ...opts, caps }), key: Date.now() })
    setScreen('session')
  }

  const actions = {
    answer: (wordId, correct) => setCard(wordId, (c) => applyAnswer(c, correct)),
    discover: (wordId, known) => setCard(wordId, () => discoverCard(known)),
    focus: (wordId) => setCard(wordId, (c) => focusCard(c)),
    xp: (amount) => amount > 0 && updateProfile((p) => awardXp(p, amount, prefs.deviceId)),
  }

  const goMap = () => {
    setRun(null)
    setScreen('map')
  }

  // ---- Screens without a signed-in explorer ----
  if (screen === 'onboarding') {
    return (
      <Onboarding
        canCancel
        busy={creating.busy}
        error={creating.error}
        onCancel={() => setScreen('profiles')}
        onDone={createExplorer}
      />
    )
  }

  if (!profile || screen === 'profiles') {
    return (
      <ProfilePicker
        profiles={explorers}
        status={listStatus}
        onUnlock={signIn}
        onNew={() => {
          setCreating({ busy: false, error: '' })
          setScreen('onboarding')
        }}
      />
    )
  }

  // ---- Playing ----
  const soundToggle = { on: prefs.sound, toggle: () => setPrefs((p) => ({ ...p, sound: !p.sound })) }

  switch (screen) {
    case 'session':
      return (
        <Session
          key={run.key}
          profile={profile}
          steps={run.steps}
          mode={run.mode}
          topicId={run.topicId}
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
          onAdd={(word) => updateProfile((p) => ({ ...p, custom: [...p.custom, { ...word, at: Date.now() }] }))}
          onRemove={(id) =>
            updateProfile((p) => {
              const cards = { ...p.cards }
              delete cards[id]
              return { ...p, custom: p.custom.filter((w) => w.id !== id), cards, removed: { ...p.removed, [id]: Date.now() } }
            })
          }
          onPractice={() => startRun({ mode: 'tricky' })}
          onExit={goMap}
        />
      )
    case 'settings':
      return (
        <Settings
          profile={profile}
          onSave={(changes) => {
            changeSettings(changes)
            setScreen('map')
          }}
          onChangePin={async (pin) => {
            await flush()
            const key = await changePin(latest.current.profile, session.key, pin)
            const s = { id: profile.id, key }
            saveSession(s)
            latest.current = { ...latest.current, key }
            setSession(s)
          }}
          onDelete={async () => {
            const { key } = latest.current
            await stopSync()
            try {
              await deleteProfile(profile, key)
            } catch (e) {
              stopped.current = false
              latest.current = { profile, key }
              throw e
            }
            saveCache(profile.id, null)
            saveSession(null)
            setSession(null)
            setProfile(null)
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
          sync={sync}
          onIsland={(topicId) => startRun({ mode: 'island', topicId })}
          onReview={() => startRun({ mode: 'review' })}
          onTricky={() => startRun({ mode: 'tricky' })}
          onSpeak={() => setScreen('speak')}
          onWords={() => setScreen('words')}
          onSettings={() => setScreen('settings')}
          onLevelUp={(level) => changeSettings({ level })}
          onSwitch={signOut}
        />
      )
  }
}
