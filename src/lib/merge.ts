import type { Card, Level, LevelProgress, Progress } from '../types'
import { normalizeProgress } from './storage'

const LEVELS: Level[] = ['n5', 'n4', 'n3', 'n2', 'n1']

function pickCard(local: Card | undefined, remote: Card | undefined): Card | undefined {
  if (!local) return remote
  if (!remote) return local

  const localTime = local.updatedAt ?? 0
  const remoteTime = remote.updatedAt ?? 0
  if (localTime !== remoteTime) return localTime > remoteTime ? local : remote
  if (local.reps !== remote.reps) return local.reps > remote.reps ? local : remote

  // Identical history: prefer the remote copy so every device converges.
  return remote
}

function mergeNewToday(
  local: LevelProgress,
  remote: LevelProgress,
): LevelProgress['newToday'] {
  const localReset = local.resetAt ?? 0
  const remoteReset = remote.resetAt ?? 0
  if (localReset > remoteReset) return local.newToday
  if (remoteReset > localReset) return remote.newToday

  if (local.newToday.date === remote.newToday.date) {
    return {
      date: local.newToday.date,
      count: Math.max(local.newToday.count, remote.newToday.count),
    }
  }
  return local.newToday.date > remote.newToday.date ? local.newToday : remote.newToday
}

/**
 * Merge two progress snapshots:
 * - Cards are chosen independently by their last-modified time.
 * - A level reset records a timestamp; cards not touched since that reset are discarded.
 * - Settings/streak come from the newer overall snapshot.
 */
export function mergeProgress(localInput: Progress, remoteInput: Progress): Progress {
  const local = normalizeProgress(localInput)
  const remote = normalizeProgress(remoteInput)
  const preferLocal = (local.updatedAt ?? 0) > (remote.updatedAt ?? 0)

  const levels = Object.fromEntries(
    LEVELS.map((level) => {
      const localLevel = local.levels[level]
      const remoteLevel = remote.levels[level]
      const resetAt = Math.max(localLevel.resetAt ?? 0, remoteLevel.resetAt ?? 0)
      const cards: Record<string, Card> = {}

      const kanji = new Set([
        ...Object.keys(localLevel.cards),
        ...Object.keys(remoteLevel.cards),
      ])
      for (const key of kanji) {
        const card = pickCard(localLevel.cards[key], remoteLevel.cards[key])
        if (!card) continue
        // A reset deletes every card that existed at reset time.
        if (resetAt > 0 && (card.updatedAt ?? 0) <= resetAt) continue
        cards[key] = card
      }

      return [
        level,
        {
          cards,
          newToday: mergeNewToday(localLevel, remoteLevel),
          resetAt,
        },
      ]
    }),
  ) as Progress['levels']

  return {
    version: 1,
    levels,
    settings: preferLocal ? local.settings : remote.settings,
    streak: preferLocal ? local.streak : remote.streak,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  }
}
