import type { VocabWord } from '../types'

export type VocabQuizDirection = 'ja-en' | 'en-ja'
export type VocabQuizKind = VocabQuizDirection | 'mixed'

export interface VocabQuizOption {
  label: string
  /** Kanji hint shown under Japanese options. */
  sub?: string
}

export interface VocabQuizQuestion {
  kind: VocabQuizDirection
  word: VocabWord
  options: VocabQuizOption[]
  answer: number
}

export const VOCAB_QUIZ_KIND_LABEL: Record<
  VocabQuizKind,
  { title: string; blurb: string }
> = {
  'ja-en': {
    title: 'Japanese → English',
    blurb: 'See a word, pick its English meaning.',
  },
  'en-ja': {
    title: 'English → Japanese',
    blurb: 'See an English meaning, pick the Japanese word.',
  },
  mixed: {
    title: 'Mixed',
    blurb: 'A mix of both directions.',
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

function labelOf(word: VocabWord, direction: VocabQuizDirection): string {
  return direction === 'ja-en' ? word.english : word.word
}

function optionOf(word: VocabWord, direction: VocabQuizDirection): VocabQuizOption {
  return direction === 'ja-en'
    ? { label: word.english }
    : { label: word.word, sub: word.kanji }
}

function buildOptions(
  answer: VocabWord,
  direction: VocabQuizDirection,
  pool: VocabWord[],
  fallbackPool: VocabWord[],
  rng: () => number,
): { options: VocabQuizOption[]; answer: number } {
  const answerLabel = labelOf(answer, direction)
  const seen = new Set([answerLabel])
  const distractors: VocabWord[] = []

  for (const source of [pool, fallbackPool]) {
    for (const candidate of shuffle(source, rng)) {
      const label = labelOf(candidate, direction)
      if (seen.has(label)) continue
      seen.add(label)
      distractors.push(candidate)
      if (distractors.length === 3) break
    }
    if (distractors.length === 3) break
  }

  const options = shuffle([answer, ...distractors], rng).map((word) =>
    optionOf(word, direction),
  )
  return { options, answer: options.findIndex((option) => option.label === answerLabel) }
}

/**
 * Build a vocabulary quiz for one lesson. Distractors come from the lesson
 * first, then fall back to `fallbackWords` (usually the whole level) when a
 * lesson has too few words.
 */
export function buildVocabQuiz(
  words: VocabWord[],
  kind: VocabQuizKind,
  count = 15,
  rng: () => number = Math.random,
  fallbackWords: VocabWord[] = words,
): VocabQuizQuestion[] {
  const questions: VocabQuizQuestion[] = []

  for (const word of shuffle(words, rng)) {
    if (questions.length >= count) break
    if (!word.word || !word.english) continue

    const direction: VocabQuizDirection =
      kind === 'mixed' ? (rng() < 0.5 ? 'ja-en' : 'en-ja') : kind
    const { options, answer } = buildOptions(
      word,
      direction,
      words,
      fallbackWords,
      rng,
    )
    if (options.length < 3) continue

    questions.push({ kind: direction, word, options, answer })
  }

  return questions
}
