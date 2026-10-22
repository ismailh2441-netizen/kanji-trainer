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
}

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy */
export type Grade = 1 | 2 | 3 | 4

export interface LevelProgress {
  cards: Record<string, Card>
  newToday: { date: string; count: number }
}

export interface Progress {
  version: 1
  levels: Record<Level, LevelProgress>
  settings: { newPerDay: number }
  streak: { last: string; count: number }
}
