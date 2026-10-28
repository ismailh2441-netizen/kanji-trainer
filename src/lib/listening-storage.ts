import { useSyncExternalStore } from 'react'

const KEY = 'kanji-trainer-listening-v1'

export interface ListeningProgress {
  /** Keyed by `${level}-l${listeningLevel}`, e.g. 'n5-l1'. */
  completed: Record<string, string[]>
}

function defaultProgress(): ListeningProgress {
  return { completed: {} }
}

function load(): ListeningProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultProgress()
    const parsed = JSON.parse(raw) as { completed?: unknown }
    const completed: Record<string, string[]> = {}
    if (parsed?.completed && typeof parsed.completed === 'object') {
      for (const [key, value] of Object.entries(parsed.completed)) {
        if (Array.isArray(value)) {
          completed[key] = value.filter((id): id is string => typeof id === 'string')
        }
      }
    }
    return { completed }
  } catch {
    return defaultProgress()
  }
}

let progress: ListeningProgress = load()
const listeners = new Set<() => void>()

function commit(next: ListeningProgress) {
  progress = next
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Storage full or unavailable — keep in-memory state.
  }
  for (const listener of listeners) listener()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getListeningProgress(): ListeningProgress {
  return progress
}

export function useListeningProgress(): ListeningProgress {
  return useSyncExternalStore(subscribe, getListeningProgress, getListeningProgress)
}

export function markListeningComplete(levelKey: string, exerciseId: string) {
  const current = progress.completed[levelKey] ?? []
  if (current.includes(exerciseId)) return
  commit({
    completed: {
      ...progress.completed,
      [levelKey]: [...current, exerciseId],
    },
  })
}
