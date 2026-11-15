// Interface language. The English text is the key; src/data/tr.js holds the Turkish versions.
// What is being learned (words, example sentences, stories, role-play lines) always stays English.
//
//   const t = useT()
//   t('Play now')                       → "Şimdi oyna"
//   t('Rank {n}', { n: 3 })             → "Rütbe 3"
//   t.plural(n, one, many)               → picks the English singular or plural by n; Turkish has one form
import { createContext, createElement, useContext, useEffect } from 'react'
import TR from '../data/tr.js'

// (No flag emojis: Windows shows them as plain letters.)
export const LANGS = [
  { id: 'en', name: 'English' },
  { id: 'tr', name: 'Türkçe' },
]

// New explorers start in Turkish at Beginner level and in English otherwise.
export const defaultLangForLevel = (level) => (level === 'beginner' ? 'tr' : 'en')

// The language an explorer sees. Explorers from before this setting follow their level.
export const langOf = (profile) => profile?.lang ?? defaultLangForLevel(profile?.level)

// Language for screens before anyone signs in, on a device that has not chosen one yet.
export const browserLang = () => (typeof navigator !== 'undefined' && /^tr\b/i.test(navigator.language ?? '') ? 'tr' : 'en')

export function translate(lang, text, vars) {
  let s = lang === 'tr' ? (TR[text] ?? text) : text
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m))
  return s
}

export function makeT(lang) {
  const t = (text, vars) => translate(lang, text, vars)
  t.plural = (n, one, many, vars) => translate(lang, n === 1 ? one : many, { n, ...vars })
  t.lang = lang
  return t
}

export const LangContext = createContext('en')

export function useT() {
  return makeT(useContext(LangContext))
}

// Sets the language for everything inside it, and on the page itself (<html lang>), so the
// browser applies Turkish rules too: "isim" in capitals is "İSİM", not "ISIM".
export function LangRoot({ lang, children }) {
  useEffect(() => {
    const before = document.documentElement.lang
    document.documentElement.lang = lang
    return () => {
      document.documentElement.lang = before
    }
  }, [lang])
  return createElement(LangContext.Provider, { value: lang }, children)
}
