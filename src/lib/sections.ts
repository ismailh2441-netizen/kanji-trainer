import type { KanjiEntry, Level } from '../types'

/**
 * Target kanji per section. Smaller levels use session-sized batches so one
 * section can be memorized in a sitting; bigger levels use larger batches so
 * the section picker stays manageable.
 */
const TARGET_SIZE: Record<Level, number> = {
  n5: 20,
  n4: 25,
  n3: 40,
  n2: 50,
  n1: 50,
}

export interface Section {
  /** 1-based section number. */
  id: number
  kanji: string[]
}

/**
 * Split a level's deck into balanced sections, in deck order (the order new
 * cards are introduced by Review). Sizes are balanced so no tiny leftover
 * group appears at the end — e.g. N5's 79 kanji → 20 · 20 · 20 · 19.
 */
export function levelSections(level: Level, deck: KanjiEntry[]): Section[] {
  const total = deck.length
  if (total === 0) return []
  const count = Math.max(1, Math.ceil(total / TARGET_SIZE[level]))
  const base = Math.floor(total / count)
  const extra = total % count // the first `extra` sections get one more kanji
  const sections: Section[] = []
  let pos = 0
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0)
    sections.push({ id: i + 1, kanji: deck.slice(pos, pos + size).map((e) => e.kanji) })
    pos += size
  }
  return sections
}

/** Read `?section=N` from the current URL search string. */
export function parseSection(search: string): number | null {
  const raw = new URLSearchParams(search).get('section')
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * Restrict a deck to one section. An unknown/invalid section id falls back to
 * the full deck (with `section: null`).
 */
export function scopeDeck(
  level: Level,
  deck: KanjiEntry[],
  sectionId: number | null,
): { deck: KanjiEntry[]; section: Section | null } {
  if (sectionId == null) return { deck, section: null }
  const section = levelSections(level, deck).find((s) => s.id === sectionId)
  if (!section) return { deck, section: null }
  const set = new Set(section.kanji)
  return { deck: deck.filter((e) => set.has(e.kanji)), section }
}
