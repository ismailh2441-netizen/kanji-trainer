import { useSyncExternalStore } from 'react'
import { type Card, type Grade, type Level, type LevelProgress, type Progress } from '../types'
import { dateStr, gradeCard } from './srs'

const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'] as Level[]
const KEY = 'kanji-trainer-progress-v1'

function emptyLevel(): LevelProgress {
  return { cards: {}, newToday: { date: '', count: 0 }, resetAt: 0 }
}

export function defaultProgress(): Progress {
  return {
    version: 1,
    levels: {
      n5: emptyLevel(),
      n4: emptyLevel(),
      n3: emptyLevel(),
      n2: emptyLevel(),
      n1: emptyLevel(),
    },
    settings: { newPerDay: 10 },
    streak: { last: '', count: 0 },
    updatedAt: 0,
  }
}

function normalizeCard(card: Card): Card {
  return {
    ...card,
    updatedAt: typeof card.updatedAt === 'number' ? card.updatedAt : 0,
  }
}

/**
 * Accepts old local backups (which have no timestamps) and always returns the
 * same shape. Version 1 is kept so existing exported backups still import.
 */
export function normalizeProgress(input: unknown): Progress {
  const parsed = input as Partial<Progress> | null | undefined
  const base = defaultProgress()
  if (!parsed || parsed.version !== 1) return base

  const levels = Object.fromEntries(
    LEVELS.map((level: Level) => {
      const lp = parsed.levels?.[level]
      const rawCards =
        lp?.cards && typeof lp.cards === 'object' ? (lp.cards as Record<string, Card>) : {}
      const cards = Object.fromEntries(
        Object.entries(rawCards)
          .filter(([, card]) => card && typeof card === 'object')
          .map(([kanji, card]) => [kanji, normalizeCard(card)]),
      ) as Record<string, Card>

      const newToday =
        lp?.newToday && typeof lp.newToday.date === 'string'
          ? {
              date: lp.newToday.date,
              count: Number.isFinite(lp.newToday.count) ? lp.newToday.count : 0,
            }
          : { date: '', count: 0 }

      return [
        level,
        {
          cards,
          newToday,
          resetAt: typeof lp?.resetAt === 'number' ? lp.resetAt : 0,
        },
      ]
    }),
  ) as Progress['levels']

  const newPerDay =
    parsed.settings && Number.isFinite(parsed.settings.newPerDay)
      ? parsed.settings.newPerDay
      : base.settings.newPerDay

  return {
    version: 1,
    levels,
    settings: { newPerDay },
    streak: {
      last: typeof parsed.streak?.last === 'string' ? parsed.streak.last : '',
      count:
        typeof parsed.streak?.count === 'number' && Number.isFinite(parsed.streak.count)
          ? parsed.streak.count
          : 0,
    },
    updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
  }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultProgress()
    return normalizeProgress(JSON.parse(raw))
  } catch {
    return defaultProgress()
  }
}

let progress: Progress = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Storage full or unavailable — keep in-memory state.
  }
}

function notify() {
  for (const listener of listeners) listener()
}

function commit(next: Progress) {
  progress = normalizeProgress({ ...next, version: 1, updatedAt: Date.now() })
  persist()
  notify()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getProgress(): Progress {
  return progress
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, getProgress)
}

/** Used by the cloud sync engine to notice local changes. */
export function subscribeProgress(cb: () => void): () => void {
  return subscribe(cb)
}

/** Replace the in-memory/local copy with a remote snapshot (without bumping timestamps). */
export function applyProgress(next: Progress) {
  progress = normalizeProgress(next)
  persist()
  notify()
}

/** Clear the local cache, e.g. when signing out on a shared device. */
export function clearProgress() {
  progress = defaultProgress()
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable — the in-memory reset is enough.
  }
  notify()
}

function touchStreak(streak: Progress['streak'], now: number): Progress['streak'] {
  const today = dateStr(now)
  if (streak.last === today) return streak
  const yesterday = dateStr(now - 86_400_000)
  return { last: today, count: streak.last === yesterday ? streak.count + 1 : 1 }
}

export function recordStudy(level: Level, kanji: string, grade: Grade, now = Date.now()) {
  const lp = progress.levels[level]
  const isNew = !lp.cards[kanji]
  const cards = {
    ...lp.cards,
    [kanji]: { ...gradeCard(lp.cards[kanji], grade, now), updatedAt: now },
  }
  const today = dateStr(now)
  const newToday =
    isNew && lp.newToday.date === today
      ? { date: today, count: lp.newToday.count + 1 }
      : isNew
        ? { date: today, count: 1 }
        : lp.newToday

  commit({
    ...progress,
    levels: {
      ...progress.levels,
      [level]: { cards, newToday, resetAt: lp.resetAt ?? 0 },
    },
    streak: touchStreak(progress.streak, now),
  })
}

export function setNewPerDay(n: number) {
  commit({ ...progress, settings: { newPerDay: n } })
}

export function resetLevel(level: Level) {
  commit({
    ...progress,
    levels: {
      ...progress.levels,
      [level]: { ...emptyLevel(), resetAt: Date.now() },
    },
  })
}

export function resetAll() {
  const now = Date.now()
  const levels = Object.fromEntries(
    LEVELS.map((level) => [level, { ...emptyLevel(), resetAt: now }]),
  ) as Progress['levels']
  commit({ ...defaultProgress(), levels, updatedAt: now })
}

export function exportProgress(): string {
  return JSON.stringify(progress, null, 2)
}

export function importProgress(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Partial<Progress>
    if (parsed?.version !== 1 || !parsed.levels || !parsed.settings) return false

    // An import is an intentional replacement: mark every card as just edited
    // and reset markers above the old cloud timestamps so cloud-only cards do
    // not get merged back in.
    const now = Date.now()
    const imported = normalizeProgress(parsed)
    const levels = Object.fromEntries(
      LEVELS.map((level) => {
        const lp = imported.levels[level]
        const hasCards = Object.keys(lp.cards).length > 0
        const cards = Object.fromEntries(
          Object.entries(lp.cards).map(([kanji, card]) => [
            kanji,
            { ...card, updatedAt: now },
          ]),
        ) as Record<string, Card>
        return [level, { ...lp, cards, resetAt: hasCards ? now - 1 : now }]
      }),
    ) as Progress['levels']

    commit({ ...imported, levels, updatedAt: now })
    return true
  } catch {
    return false
  }
}
