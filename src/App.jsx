import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadCache,
  loadPrefs,
  loadPublicCache,
  loadSession,
  loadUnsyncedExplorers,
  saveCache,
  savePrefs,
  savePublicCache,
  saveSession,
} from './lib/storage.js'
import { awardXp, mergeProgress, newProgress, publicFields, todayKey } from './lib/progress.js'
import { changePin, deleteProfile, keyFor, newProfileId, saveProgress, unlock, watchProfiles } from './lib/cloud.js'
import { withTimeout } from './lib/timeout.js'
import { browserLang, LangRoot, langOf } from './lib/i18n.js'
import { applyAnswer, buildSession, discoverCard, focusCard, isStarred } from './lib/srs.js'
import { buildExam, islandKey, islandSessionOptions, legacyOpenCount } from './lib/islands.js'
import { caps } from './lib/speech.js'
import { setSoundEnabled } from './lib/sound.js'
import ProfilePicker from './components/ProfilePicker.jsx'
import Onboarding from './components/Onboarding.jsx'
import MapScreen from './components/MapScreen.jsx'
import Session from './components/Session.jsx'
import IslandScreen from './components/IslandScreen.jsx'
import StoryTower from './components/StoryTower.jsx'
import RolePlay from './components/RolePlay.jsx'
import SpeakStudio from './components/SpeakStudio.jsx'
import MyWords from './components/MyWords.jsx'
import Settings from './components/Settings.jsx'

const SAVE_DELAY = 1500
const OFFLINE_MSG = "Couldn't reach the cloud. Check your internet connection and try again."
// A device that played this explorer before waits this long for the cloud's PIN check, then opens
// its own saved copy (the PIN still has to match that copy).
const KNOWN_DEVICE_WAIT = 4000
// Signing out waits at most this long for the last save; anything unsaved stays on this device
// and uploads the next time this explorer signs in here.
const SIGN_OUT_WAIT = 8000

function startState() {
  const session = loadSession()
  const cached = session ? loadCache(session.id) : null
  return session && cached?.key === session.key
    ? { session, profile: cached.data, isNew: !!cached.isNew }
    : { session: null, profile: null, isNew: false }
}

export default function App() {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [start] = useState(startState)
  const [session, setSession] = useState(start.session)
  const [profile, setProfile] = useState(start.profile)
  const [screen, setScreen] = useState(start.profile ? 'map' : 'profiles')
  const [run, setRun] = useState(null)
  const [island, setIsland] = useState(null)
  const [wordsFilter, setWordsFilter] = useState('all')
  const [explorers, setExplorers] = useState(loadPublicCache)
  const [listStatus, setListStatus] = useState('loading')
  const [sync, setSync] = useState('saved')
  const [creating, setCreating] = useState({ busy: false, error: '' })

  useEffect(() => savePrefs(prefs), [prefs])
  // The start screen of this device follows the language of the explorer who played last.
  // It is kept as `menuLang`: an older `lang` value was written automatically, not chosen, so it is ignored.
  const profileLang = profile?.lang ?? null
  useEffect(() => {
    if (profileLang) setPrefs((p) => (p.menuLang === profileLang ? p : { ...p, menuLang: profileLang }))
  }, [profileLang])
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
  // True until a newly created explorer has reached the cloud for the first time.
  const fresh = useRef(start.isNew)

  // Returns a promise that settles when the cloud copy is up to date (or the save failed).
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (inflight.current) return inflight.current
    const { profile: p, key } = latest.current
    if (!p || !key) return Promise.resolve()
    const sent = changes.current
    setSync('saving')
    inflight.current = saveProgress(key, p, { allowCreate: fresh.current })
      .then(
        (merged) => {
          fresh.current = false
          // Keep anything played while the save was on its way.
          setProfile((cur) => (cur && cur.id === merged.id ? mergeProgress(cur, merged) : cur))
          if (changes.current === sent) changes.current = 0
          setSync(changes.current ? 'saving' : 'saved')
        },
        (e) => {
          if (e?.code === 'gone') {
            // The PIN was changed or the explorer deleted elsewhere: stop retrying.
            changes.current = 0
            setSync('gone')
          } else {
            setSync('offline')
          }
        },
      )
      .finally(() => {
        inflight.current = null
        if (changes.current && latest.current.key) timer.current = setTimeout(flush, SAVE_DELAY)
      })
    return inflight.current
  }, [])

  // Finishes any save on its way, then stops syncing the current explorer.
  const stopSync = async () => {
    await withTimeout(flush(), SIGN_OUT_WAIT).catch(() => {})
    clearTimeout(timer.current)
    changes.current = 0
    stopped.current = true
    latest.current = { profile: null, key: null }
  }

  useEffect(() => {
    if (profile && session)
      saveCache(profile.id, { key: session.key, data: profile, pending: changes.current > 0, isNew: fresh.current })
  }, [profile, session, sync])

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
  // pending: there are changes the cloud has not seen yet. isNew: the explorer is not in the cloud yet.
  const open = (id, key, data, { pending = false, isNew = false } = {}) => {
    const s = { id, key }
    saveSession(s)
    saveCache(id, { key, data, pending, isNew })
    stopped.current = false
    latest.current = { profile: data, key }
    fresh.current = isNew
    changes.current = pending ? 1 : 0
    setSession(s)
    setProfile(data)
    setScreen('map')
    flush()
  }

  const signIn = async (id, pin) => {
    const key = await keyFor(id, pin)
    const cached = loadCache(id)
    const known = cached?.key === key
    let remote
    try {
      remote = await (known ? withTimeout(unlock(id, key), KNOWN_DEVICE_WAIT) : unlock(id, key))
    } catch {
      // Offline or slow: a device that played this explorer before can check the PIN itself.
      if (known) {
        open(id, key, cached.data, { pending: !!cached.pending, isNew: !!cached.isNew })
        return 'ok'
      }
      return 'offline'
    }
    if (!remote) {
      // Created on this device while offline and not uploaded yet: the saved copy is the only one.
      if (known && cached.isNew) {
        open(id, key, cached.data, { pending: true, isNew: true })
        return 'ok'
      }
      return 'wrong'
    }
    open(id, key, known ? mergeProgress(cached.data, remote) : remote, { pending: known && !!cached.pending })
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
      const key = await keyFor(p.id, pin)
      setCreating({ busy: false, error: '' })
      // The explorer starts playing on this device right away. The first sync puts them in the
      // cloud; until then the map shows "Saving…" or "Offline · will sync".
      open(p.id, key, p, { pending: true, isNew: true })
    } catch {
      setCreating({ busy: false, error: OFFLINE_MSG })
    }
  }

  // Explorers from before the language setting take the language of the start screen they signed
  // in from, once; it is saved with them, so every device shows the same from then on.
  useEffect(() => {
    if (profile && !profile.lang) changeSettings({ lang: prefs.menuLang ?? browserLang() })
  }, [profile?.id, profile?.lang])

  // Explorers who played before island conquest keep the islands they had already opened.
  useEffect(() => {
    if (profile && !profile.openIslands) updateProfile((p) => (p.openIslands ? p : { ...p, openIslands: { [p.level]: legacyOpenCount(p) } }))
  }, [profile?.id, profile?.openIslands])

  const startRun = (opts) => {
    const steps = opts.mode === 'exam' ? buildExam(profile, opts.topicId, caps) : buildSession(profile, { ...opts, caps })
    setRun({ ...opts, steps, key: Date.now() })
    setScreen('session')
  }

  const openIsland = (topicId) => {
    setIsland(topicId)
    setScreen('island')
  }

  // Records a step of island conquest (story read, scene played, exam passed or failed).
  const markIsland = (topicId, fields) =>
    updateProfile((p) => {
      const key = islandKey(p.level, topicId)
      return { ...p, islands: { ...p.islands, [key]: { ...p.islands?.[key], ...fields } } }
    })

  const actions = {
    answer: (wordId, correct) => setCard(wordId, (c) => applyAnswer(c, correct)),
    discover: (wordId, known) => setCard(wordId, () => discoverCard(known)),
    focus: (wordId) => setCard(wordId, (c) => focusCard(c)),
    star: (wordId) =>
      updateProfile((p) => ({ ...p, starred: { ...p.starred, [wordId]: { on: !isStarred(p, wordId), at: Date.now() } } })),
    xp: (amount) => amount > 0 && updateProfile((p) => awardXp(p, amount, prefs.deviceId)),
  }

  const goMap = () => {
    setRun(null)
    setScreen('map')
  }

  const backToIsland = () => {
    setRun(null)
    setScreen('island')
  }

  // ---- Interface language: the explorer's own while playing, this device's before signing in ----
  const deviceLang = prefs.menuLang ?? browserLang()
  const signedIn = profile && screen !== 'profiles' && screen !== 'onboarding'
  const uiLang = signedIn ? langOf(profile, deviceLang) : deviceLang
  const setDeviceLang = (lang) => setPrefs((p) => ({ ...p, menuLang: lang }))

  return <LangRoot lang={uiLang}>{view()}</LangRoot>

  function view() {
  // ---- Screens without a signed-in explorer ----
  if (screen === 'onboarding') {
    return (
      <Onboarding
        canCancel
        lang={deviceLang}
        busy={creating.busy}
        error={creating.error}
        onCancel={() => setScreen('profiles')}
        onDone={createExplorer}
      />
    )
  }

  if (!profile || screen === 'profiles') {
    const unsynced = loadUnsyncedExplorers()
      .filter((p) => !explorers.some((e) => e.id === p.id))
      .map((p) => ({ id: p.id, ...publicFields(p) }))
    return (
      <ProfilePicker
        profiles={[...explorers, ...unsynced]}
        status={listStatus}
        lang={deviceLang}
        onLang={setDeviceLang}
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
          onExamDone={(passed) =>
            markIsland(run.topicId, passed ? { examPassedAt: Date.now() } : { examFailedOn: todayKey() })
          }
          onExit={run.mode === 'island' || run.mode === 'exam' ? backToIsland : goMap}
        />
      )
    case 'island':
      return (
        <IslandScreen
          profile={profile}
          topicId={island}
          onPlay={() => startRun(islandSessionOptions(profile, island))}
          onStory={() => setScreen('story')}
          onRolePlay={() => setScreen('roleplay')}
          onExam={() => startRun({ mode: 'exam', topicId: island })}
          onBack={goMap}
        />
      )
    case 'story':
      return (
        <StoryTower
          profile={profile}
          topicId={island}
          actions={actions}
          onDone={() => markIsland(island, { storyAt: Date.now() })}
          onExit={backToIsland}
        />
      )
    case 'roleplay':
      return (
        <RolePlay
          profile={profile}
          topicId={island}
          actions={actions}
          onDone={() => markIsland(island, { roleplayAt: Date.now() })}
          onExit={backToIsland}
        />
      )
    case 'speak':
      return <SpeakStudio profile={profile} actions={actions} onExit={goMap} />
    case 'words':
      return (
        <MyWords
          key={wordsFilter}
          initialFilter={wordsFilter}
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
          onSignOut={signOut}
          onSave={(changes) => {
            changeSettings(changes)
            setScreen('map')
          }}
          onChangePin={async (pin) => {
            await withTimeout(flush(), SIGN_OUT_WAIT).catch(() => {})
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
          onIsland={openIsland}
          onReview={() => startRun({ mode: 'review' })}
          onTricky={() => startRun({ mode: 'tricky' })}
          onSpeak={() => setScreen('speak')}
          onWords={(filter) => {
            setWordsFilter(filter ?? 'all')
            setScreen('words')
          }}
          onStarred={() => startRun({ mode: 'starred' })}
          onSettings={() => setScreen('settings')}
          onLevelUp={(level) => changeSettings({ level })}
          onSwitch={signOut}
        />
      )
  }
  }
}
