import { useSyncExternalStore } from 'react'
import { type Grade, type Level, type LevelProgress, type Progress } from '../types'
import { dateStr, gradeCard } from './srs'

const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'] as Level[]
const KEY = 'kanji-trainer-progress-v1'

function emptyLevel(): LevelProgress {
  return { cards: {}, newToday: { date: '', count: 0 } }
}

function defaultProgress(): Progress {
  return {
    version: 1,
    levels: { n5: emptyLevel(), n4: emptyLevel(), n3: emptyLevel(), n2: emptyLevel(), n1: emptyLevel() },
    settings: { newPerDay: 10 },
    streak: { last: '', count: 0 },
  }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultProgress()
    const parsed = JSON.parse(raw) as Progress
    if (parsed?.version !== 1) return defaultProgress()
    const base = defaultProgress()
    return {
      version: 1,
      levels: Object.fromEntries(
        LEVELS.map((l: Level) => [l, parsed.levels?.[l] ?? base.levels[l]]),
      ) as Progress['levels'],
      settings: { newPerDay: parsed.settings?.newPerDay ?? 10 },
      streak: { last: parsed.streak?.last ?? '', count: parsed.streak?.count ?? 0 },
    }
  } catch {
    return defaultProgress()
  }
}

let progress: Progress = load()
const listeners = new Set<() => void>()

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Storage full or unavailable — keep in-memory state.
  }
  for (const l of listeners) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function commit(next: Progress) {
  progress = next
  emit()
}

export function getProgress(): Progress {
  return progress
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, getProgress)
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
  const cards = { ...lp.cards, [kanji]: gradeCard(lp.cards[kanji], grade, now) }
  const today = dateStr(now)
  const newToday =
    isNew && lp.newToday.date === today
      ? { date: today, count: lp.newToday.count + 1 }
      : isNew
        ? { date: today, count: 1 }
        : lp.newToday

  commit({
    ...progress,
    levels: { ...progress.levels, [level]: { cards, newToday } },
    streak: touchStreak(progress.streak, now),
  })
}

export function setNewPerDay(n: number) {
  commit({ ...progress, settings: { ...progress.settings, newPerDay: n } })
}

export function resetLevel(level: Level) {
  commit({ ...progress, levels: { ...progress.levels, [level]: emptyLevel() } })
}

export function resetAll() {
  commit(defaultProgress())
}

export function exportProgress(): string {
  return JSON.stringify(progress, null, 2)
}

export function importProgress(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Progress
    if (parsed?.version !== 1 || !parsed.levels || !parsed.settings) return false
    localStorage.setItem(KEY, JSON.stringify(parsed))
    progress = load()
    emit()
    return true
  } catch {
    return false
  }
}
