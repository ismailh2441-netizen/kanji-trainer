import type { Card, KanjiEntry, Level, Progress } from '../types'
import { DAY_MS, dateStr, startOfDay } from './srs'

export const LEVELS: Level[] = ['n5', 'n4', 'n3', 'n2', 'n1']

export const LEVEL_LABEL: Record<Level, string> = {
  n5: 'N5',
  n4: 'N4',
  n3: 'N3',
  n2: 'N2',
  n1: 'N1',
}

export const LEVEL_NAME: Record<Level, string> = {
  n5: 'Beginner',
  n4: 'Elementary',
  n3: 'Intermediate',
  n2: 'Upper Intermediate',
  n1: 'Advanced',
}

/** Tailwind classes per level. Kept as full literal strings so Tailwind can see them. */
export const LEVEL_THEME: Record<Level, { badge: string; text: string; bg: string; fill: string; bar: string }> = {
  n5: { badge: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700', bg: 'bg-emerald-50', fill: '#059669', bar: 'bg-emerald-500' },
  n4: { badge: 'bg-sky-100 text-sky-800', text: 'text-sky-700', bg: 'bg-sky-50', fill: '#0284c7', bar: 'bg-sky-500' },
  n3: { badge: 'bg-amber-100 text-amber-800', text: 'text-amber-700', bg: 'bg-amber-50', fill: '#d97706', bar: 'bg-amber-500' },
  n2: { badge: 'bg-violet-100 text-violet-800', text: 'text-violet-700', bg: 'bg-violet-50', fill: '#7c3aed', bar: 'bg-violet-500' },
  n1: { badge: 'bg-rose-100 text-rose-800', text: 'text-rose-700', bg: 'bg-rose-50', fill: '#e11d48', bar: 'bg-rose-500' },
}

export function isLevel(value: string | undefined): value is Level {
  return value === 'n5' || value === 'n4' || value === 'n3' || value === 'n2' || value === 'n1'
}

export function strokeFile(kanji: string): string {
  return `/strokes/${kanji.codePointAt(0)!.toString(16).padStart(5, '0')}.json`
}

export interface LevelStats {
  total: number
  known: number
  learned: number
  due: number
  newAvailable: number
}

export function levelStats(
  progress: Progress,
  level: Level,
  total: number,
  now = Date.now(),
): LevelStats {
  const lp = progress.levels[level]
  const cards = Object.values(lp.cards)
  const known = cards.length
  const learned = cards.filter((c) => c.state === 'review' || c.state === 'relearning').length
  const due = cards.filter((c) => c.due <= now).length
  const today = dateStr(now)
  const usedNew = lp.newToday.date === today ? lp.newToday.count : 0
  const newAvailable = Math.max(0, Math.min(progress.settings.newPerDay - usedNew, total - known))
  return { total, known, learned, due, newAvailable }
}

export function cardStatusLabel(card: Card | undefined, now = Date.now()): string {
  if (!card) return 'New'
  if (card.due <= now) {
    if (card.state === 'review') return 'Due'
    return card.state === 'relearning' ? 'Relearning' : 'Learning'
  }
  if (card.state === 'review') {
    const days = Math.round((card.due - startOfDay(now)) / DAY_MS)
    return `Next in ${days}d`
  }
  return 'In progress'
}

/** Queue of kanji to study: due cards first (by due time), then new cards. */
export function buildQueue(
  deck: KanjiEntry[],
  progress: Progress,
  level: Level,
  newLimit: number,
  now = Date.now(),
): string[] {
  const lp = progress.levels[level]
  const due = deck
    .filter((e) => {
      const c = lp.cards[e.kanji]
      return c !== undefined && c.due <= now
    })
    .sort((a, b) => lp.cards[a.kanji].due - lp.cards[b.kanji].due)
    .map((e) => e.kanji)

  const today = dateStr(now)
  const usedNew = lp.newToday.date === today ? lp.newToday.count : 0
  const budget = Math.max(0, newLimit - usedNew)
  const fresh = deck.filter((e) => lp.cards[e.kanji] === undefined).slice(0, budget).map((e) => e.kanji)

  return [...due, ...fresh]
}
