import { useEffect, useMemo, useState } from 'react'
import type { KanjiEntry, Level } from '../types'
import { strokeFile } from '../lib/levels'
import { toHiragana } from '../lib/kana'
import { n5Readings } from '../data/readings-n5'

const loaders: Record<Level, () => Promise<{ deck: KanjiEntry[] }>> = {
  n5: () => import('../data/decks/n5'),
  n4: () => import('../data/decks/n4'),
  n3: () => import('../data/decks/n3'),
  n2: () => import('../data/decks/n2'),
  n1: () => import('../data/decks/n1'),
}

const deckCache = new Map<Level, Promise<{ deck: KanjiEntry[] }>>()

/**
 * Normalize readings for display:
 * - N5 uses the curated common-readings list (readings-n5.ts).
 * - All levels: katakana on readings are converted to hiragana (イチ → いち).
 */
function applyReadings(level: Level, deck: KanjiEntry[]): KanjiEntry[] {
  return deck.map((entry) => {
    const curated = level === 'n5' ? n5Readings[entry.kanji] : undefined
    return {
      ...entry,
      on: (curated?.on ?? entry.on).map(toHiragana),
      kun: (curated?.kun ?? entry.kun).map(toHiragana),
    }
  })
}

export function getDeck(level: Level): Promise<{ deck: KanjiEntry[] }> {
  let p = deckCache.get(level)
  if (!p) {
    p = loaders[level]().then((mod) => ({ deck: applyReadings(level, mod.deck) }))
    deckCache.set(level, p)
  }
  return p
}

export function useDeck(level: Level): {
  deck: KanjiEntry[] | null
  index: Map<string, KanjiEntry> | null
} {
  const [deck, setDeck] = useState<KanjiEntry[] | null>(null)

  useEffect(() => {
    let alive = true
    setDeck(null)
    getDeck(level).then((mod) => {
      if (alive) setDeck(mod.deck)
    })
    return () => {
      alive = false
    }
  }, [level])

  const index = useMemo(
    () => (deck ? new Map(deck.map((e) => [e.kanji, e])) : null),
    [deck],
  )
  return { deck, index }
}

const strokeCache = new Map<string, Promise<string[] | null>>()

export function getStrokes(kanji: string): Promise<string[] | null> {
  let p = strokeCache.get(kanji)
  if (!p) {
    p = fetch(strokeFile(kanji))
      .then((res) => (res.ok ? (res.json() as Promise<{ strokes: string[] }>) : null))
      .then((data) => data?.strokes ?? null)
      .catch(() => null)
    strokeCache.set(kanji, p)
  }
  return p
}

export function useStrokes(kanji: string | null): {
  strokes: string[] | null
  loading: boolean
} {
  const [strokes, setStrokes] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!kanji) {
      setStrokes(null)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setStrokes(null)
    getStrokes(kanji).then((s) => {
      if (!alive) return
      setStrokes(s)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [kanji])

  return { strokes, loading }
}
