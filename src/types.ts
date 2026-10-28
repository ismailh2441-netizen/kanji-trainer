export type Level = 'n5' | 'n4' | 'n3' | 'n2' | 'n1'

export interface Example {
  word: string
  reading: string
  english: string
  sentence: string
  sentenceEnglish: string
}

export interface KanjiEntry {
  kanji: string
  kun: string[]
  on: string[]
  meanings: string[]
  strokes: number
  examples: Example[]
}

export interface VocabWord {
  /** Main kana/katakana spelling shown to the learner. */
  word: string
  /** Optional kanji spelling, e.g. 現金 for げんきん. */
  kanji?: string
  english: string
  /** Japanese verb group, when the word is a verb. */
  group?: 'I' | 'II' | 'III'
  /** Optional usage pattern, e.g. やまに～ for のぼります. */
  usage?: string
}

export interface VocabLesson {
  /** Lesson number, e.g. 18. */
  id: number
  title: string
  words: VocabWord[]
}

export type CardState = 'learning' | 'review' | 'relearning'

export interface Card {
  state: CardState
  ease: number
  ivl: number
  due: number
  reps: number
  lapses: number
  /** Review interval (days) to restore after finishing relearning. */
  nextIvl?: number
  /** Local-modified time (ms), used to merge progress across devices. */
  updatedAt?: number
}

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy */
export type Grade = 1 | 2 | 3 | 4

export interface LevelProgress {
  cards: Record<string, Card>
  newToday: { date: string; count: number }
  /** Time (ms) of the last level reset, used to discard stale cards on merge. */
  resetAt?: number
}

export interface Progress {
  version: 1
  levels: Record<Level, LevelProgress>
  settings: { newPerDay: number }
  streak: { last: string; count: number }
  /** Local-modified time (ms), used to resolve settings/streak conflicts. */
  updatedAt?: number
}

export interface ListeningExercise {
  id: string
  level: 1 | 2 | 3
  audioUrl: string
  scriptJa: string
  /** Fully kana version of the script, so kana-only answers are accepted. */
  scriptKana?: string
  acceptableMeanings: string[]
  hint?: string
}

export interface ListeningLevelData {
  id: 1 | 2 | 3
  name: string
  description: string
  exercises: ListeningExercise[]
}
