import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import type { KanjiEntry, Level } from '../types'
import { useDeck } from './useDeck'
import { parseSection, scopeDeck, type Section } from '../lib/sections'

/**
 * The level deck, restricted to `?section=N` when that URL parameter is set.
 * `section` is null when no (valid) section filter is active.
 */
export function useScopedDeck(level: Level): {
  deck: KanjiEntry[] | null
  section: Section | null
  sectionId: number | null
} {
  const location = useLocation()
  const { deck } = useDeck(level)
  const sectionId = parseSection(location.search)

  const scoped = useMemo(
    () => (deck ? scopeDeck(level, deck, sectionId) : null),
    [deck, level, sectionId],
  )

  return {
    deck: scoped?.deck ?? null,
    section: scoped?.section ?? null,
    sectionId: scoped ? scoped.section?.id ?? null : sectionId,
  }
}
