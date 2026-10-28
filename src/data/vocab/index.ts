import type { Level, VocabLesson, VocabWord } from '../../types'
import { n5VocabLessons } from './n5'

const lessonsByLevel: Partial<Record<Level, VocabLesson[]>> = {
  n5: n5VocabLessons,
}

export function getVocabLessons(level: Level): VocabLesson[] {
  return lessonsByLevel[level] ?? []
}

export function getVocabLesson(level: Level, id: number): VocabLesson | null {
  return getVocabLessons(level).find((lesson) => lesson.id === id) ?? null
}

export function getAllVocabWords(level: Level): VocabWord[] {
  return getVocabLessons(level).flatMap((lesson) => lesson.words)
}

export function hasVocab(level: Level): boolean {
  return getVocabLessons(level).length > 0
}
