import type { KanjiEntry } from '../types'

export type QuizKind = 'meaning' | 'reading'

export interface QuizQuestion {
  kind: QuizKind
  kanji: string
  /** Reading mode: the word to display. */
  word?: string
  options: string[]
  answer: number
}

export const QUIZ_KIND_LABEL: Record<QuizKind, { title: string; blurb: string }> = {
  meaning: {
    title: 'Meaning',
    blurb: 'See a kanji, pick its English meaning.',
  },
  reading: {
    title: 'Word reading',
    blurb: 'See a word, pick how it is read.',
  },
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors(
  answer: string,
  pool: string[],
  rng: () => number,
  count = 3,
): string[] {
  const seen = new Set([answer])
  const out: string[] = []
  for (const candidate of shuffle(pool, rng)) {
    if (seen.has(candidate)) continue
    seen.add(candidate)
    out.push(candidate)
    if (out.length === count) break
  }
  return out
}

/**
 * Pick `count` distractors from `pool`; if the pool is too small (e.g. a
 * single section), fall back to `fallbackPool` (the whole level) for the
 * remaining options.
 */
function pickWithFallback(
  answer: string,
  pool: string[],
  fallbackPool: string[],
  rng: () => number,
  count = 3,
): string[] {
  const out = pickDistractors(answer, pool, rng, count)
  if (out.length >= count || fallbackPool === pool) return out
  const seen = new Set([answer, ...out])
  for (const candidate of shuffle(fallbackPool, rng)) {
    if (seen.has(candidate)) continue
    seen.add(candidate)
    out.push(candidate)
    if (out.length === count) break
  }
  return out
}

function assemble(answer: string, distractors: string[], rng: () => number): { options: string[]; answer: number } {
  const options = shuffle([answer, ...distractors], rng)
  return { options, answer: options.indexOf(answer) }
}

export function buildQuiz(
  deck: KanjiEntry[],
  kind: QuizKind,
  count: number,
  rng: () => number = Math.random,
  /** Pool for distractors when `deck` itself can't supply enough (e.g. a section). */
  fallbackDeck: KanjiEntry[] = deck,
): QuizQuestion[] {
  const meaningPool = deck.flatMap((e) => e.meanings)
  const fbMeaningPool = fallbackDeck === deck ? meaningPool : fallbackDeck.flatMap((e) => e.meanings)
  const readingPool = [
    ...new Set(deck.flatMap((e) => e.examples.map((x) => x.reading)).filter(Boolean)),
  ]
  const fbReadingPool =
    fallbackDeck === deck
      ? readingPool
      : [...new Set(fallbackDeck.flatMap((e) => e.examples.map((x) => x.reading)).filter(Boolean))]

  const questions: QuizQuestion[] = []
  for (const entry of shuffle(deck, rng)) {
    if (questions.length >= count) break

    if (kind === 'meaning') {
      const answer = entry.meanings[0]
      if (!answer) continue
      const distractors = pickWithFallback(answer, meaningPool, fbMeaningPool, rng)
      if (distractors.length < 2) continue
      questions.push({
        kind,
        kanji: entry.kanji,
        ...assemble(answer, distractors, rng),
      })
      continue
    }

    if (kind === 'reading') {
      const example = entry.examples[0]
      if (!example?.reading || !example.word) continue
      const answer = example.reading
      const distractors = pickWithFallback(answer, readingPool, fbReadingPool, rng)
      if (distractors.length < 2) continue
      questions.push({
        kind,
        kanji: entry.kanji,
        word: example.word,
        ...assemble(answer, distractors, rng),
      })
    }
  }

  return questions
}
