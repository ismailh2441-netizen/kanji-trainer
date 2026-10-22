import type { Card, Grade } from '../types'

export const MIN_MS = 60_000
export const DAY_MS = 86_400_000

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3
export const MAX_IVL = 36500

/** Learning steps in minutes, per state. */
const LEARN_STEPS = [1, 10]
const RELEARN_STEPS = [10]

export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function dateStr(now: number): string {
  const d = new Date(now)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function newCard(now: number): Card {
  return {
    state: 'learning',
    ease: DEFAULT_EASE,
    ivl: 0,
    due: now + LEARN_STEPS[0] * MIN_MS,
    reps: 0,
    lapses: 0,
    updatedAt: now,
  }
}

function graduate(card: Card, now: number, ivlDays: number): Card {
  const ivl = Math.min(MAX_IVL, Math.max(1, ivlDays))
  return {
    ...card,
    state: 'review',
    ivl,
    due: startOfDay(now) + ivl * DAY_MS,
    nextIvl: undefined,
  }
}

function stepsFor(state: Card['state']): number[] {
  return state === 'relearning' ? RELEARN_STEPS : LEARN_STEPS
}

function gradeLearning(card: Card, grade: Grade, now: number): Card {
  const steps = stepsFor(card.state)
  const base = { ...card, reps: card.reps + 1 }

  if (grade === 1) {
    return { ...base, ivl: 0, due: now + steps[0] * MIN_MS }
  }
  if (grade === 2) {
    const step = Math.min(card.ivl, steps.length - 1)
    const waitMin = steps[step] === 1 ? 5 : steps[step]
    return { ...base, ivl: step, due: now + waitMin * MIN_MS }
  }
  if (grade === 3) {
    const next = card.ivl + 1
    if (next < steps.length) {
      return { ...base, ivl: next, due: now + steps[next] * MIN_MS }
    }
    if (card.state === 'relearning') {
      return graduate(base, now, card.nextIvl ?? 1)
    }
    return graduate(base, now, 1)
  }
  // Easy
  if (card.state === 'relearning') {
    return graduate(
      { ...base, ease: card.ease + 0.15 },
      now,
      (card.nextIvl ?? 1) + 1,
    )
  }
  return graduate({ ...base, ease: card.ease + 0.15 }, now, 4)
}

function gradeReview(card: Card, grade: Grade, now: number): Card {
  const base = { ...card, reps: card.reps + 1 }

  if (grade === 1) {
    // Lapse: drop ease, relearn, then return at half the old interval.
    return {
      ...base,
      state: 'relearning',
      ease: Math.max(MIN_EASE, card.ease - 0.2),
      ivl: 0,
      due: now + RELEARN_STEPS[0] * MIN_MS,
      lapses: card.lapses + 1,
      nextIvl: Math.max(1, Math.round(card.ivl * 0.5)),
    }
  }
  if (grade === 2) {
    const ease = Math.max(MIN_EASE, card.ease - 0.15)
    const ivl = Math.max(card.ivl + 1, Math.round(card.ivl * 1.2))
    return graduate({ ...base, ease }, now, ivl)
  }
  if (grade === 3) {
    return graduate(base, now, Math.max(card.ivl + 1, Math.round(card.ivl * card.ease)))
  }
  const ease = Math.min(3.5, card.ease + 0.15)
  const ivl = Math.max(card.ivl + 2, Math.round(card.ivl * ease * 1.3))
  return graduate({ ...base, ease }, now, ivl)
}

/**
 * Apply a grade to a card. `card === undefined` means a brand-new kanji
 * that has never been studied.
 */
export function gradeCard(card: Card | undefined, grade: Grade, now: number): Card {
  if (!card || card.state === 'learning') {
    return gradeLearning(card ?? newCard(now), grade, now)
  }
  if (card.state === 'relearning') {
    return gradeLearning(card, grade, now)
  }
  return gradeReview(card, grade, now)
}

/** Human-readable interval label for grade buttons ("10m", "3d", "2mo"). */
export function formatIvl(ms: number): string {
  if (ms < 60 * MIN_MS) return `${Math.max(1, Math.round(ms / MIN_MS))}m`
  if (ms < DAY_MS) return `${Math.round(ms / (60 * MIN_MS))}h`
  const days = Math.round(ms / DAY_MS)
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

/** Preview the next-interval label for grading without committing. */
export function previewIvl(card: Card | undefined, grade: Grade, now: number): string {
  return formatIvl(gradeCard(card, grade, now).due - now)
}
