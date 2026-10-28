import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAllVocabWords, getVocabLesson } from '../data/vocab'
import { useLevel } from '../hooks/useLevel'
import {
  buildVocabQuiz,
  VOCAB_QUIZ_KIND_LABEL,
  type VocabQuizKind,
  type VocabQuizQuestion,
} from '../lib/vocabQuiz'
import type { Level, VocabLesson, VocabWord } from '../types'

const KINDS: VocabQuizKind[] = ['ja-en', 'en-ja', 'mixed']

export default function VocabQuiz() {
  const level = useLevel()
  const { lessonId } = useParams()
  const id = Number.parseInt(lessonId ?? '', 10)
  const lesson = useMemo(
    () => (level ? getVocabLesson(level, id) : null),
    [level, id],
  )
  const fallbackWords = useMemo(
    () => (level ? getAllVocabWords(level) : []),
    [level],
  )

  const [kind, setKind] = useState<VocabQuizKind>('ja-en')
  const [session, setSession] = useState(0)

  if (!level) return null

  if (!lesson) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Lesson not found</h2>
        <p className="mt-1 text-slate-500">This vocabulary lesson does not exist for this level.</p>
        <Link
          to={`/${level}/vocab`}
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to vocabulary
        </Link>
      </div>
    )
  }

  return (
    <QuizRound
      key={`${level}-${lesson.id}-${kind}-${session}`}
      level={level}
      lesson={lesson}
      kind={kind}
      fallbackWords={fallbackWords}
      onKindChange={setKind}
      onRetry={() => setSession((s) => s + 1)}
    />
  )
}

interface QuizRoundProps {
  level: Level
  lesson: VocabLesson
  kind: VocabQuizKind
  fallbackWords: VocabWord[]
  onKindChange: (kind: VocabQuizKind) => void
  onRetry: () => void
}

function QuizRound({
  level,
  lesson,
  kind,
  fallbackWords,
  onKindChange,
  onRetry,
}: QuizRoundProps) {
  const [questions] = useState<VocabQuizQuestion[]>(() =>
    buildVocabQuiz(lesson.words, kind, 15, Math.random, fallbackWords),
  )
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  function select(i: number) {
    if (chosen !== null) return
    setChosen(i)
  }

  function next() {
    if (chosen === null) return
    if (chosen === questions[idx].answer) setCorrect((c) => c + 1)
    if (idx + 1 >= questions.length) setDone(true)
    else {
      setIdx((n) => n + 1)
      setChosen(null)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Not enough words</h2>
        <p className="mt-1 text-slate-500">
          This lesson needs more words to build a quiz.
        </p>
        <Link
          to={`/${level}/vocab/${lesson.id}`}
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to the lesson
        </Link>
      </div>
    )
  }

  if (done) {
    const pct = Math.round((correct / questions.length) * 100)
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
          {pct}%
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Quiz complete</h2>
        <p className="mt-1 text-slate-500">
          {correct} correct out of {questions.length}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to={`/${level}/vocab/${lesson.id}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to lesson
          </Link>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const q = questions[idx]
  const isCorrect = chosen === q.answer
  const isWrong = chosen !== null && chosen !== q.answer

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="text-sm text-slate-500">
        <Link to={`/${level}/vocab`} className="hover:text-slate-800">
          Vocabulary
        </Link>{' '}
        /{' '}
        <Link to={`/${level}/vocab/${lesson.id}`} className="hover:text-slate-800">
          {lesson.title}
        </Link>{' '}
        / Quiz
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onKindChange(k)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                kind === k
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {VOCAB_QUIZ_KIND_LABEL[k].title}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500">
          Question {idx + 1} / {questions.length}
        </div>
      </div>

      <p className="text-sm text-slate-500">{VOCAB_QUIZ_KIND_LABEL[kind].blurb}</p>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {q.kind === 'ja-en' ? (
          <div className="text-center">
            <div className="font-jp text-6xl text-slate-900">{q.word.word}</div>
            {q.word.kanji && (
              <div className="mt-1 font-jp text-lg text-slate-500">{q.word.kanji}</div>
            )}
            {q.word.group && (
              <div className="mt-2 inline-flex rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Group {q.word.group}
              </div>
            )}
            <div className="mt-3 text-sm text-slate-500">Pick the meaning</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">{q.word.english}</div>
            <div className="mt-3 text-sm text-slate-500">Pick the Japanese word</div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-2">
          {q.options.map((opt, i) => {
            const base = 'rounded-xl border px-4 py-2.5 text-left font-semibold transition'
            let cls = 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            if (chosen !== null) {
              if (i === q.answer) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800'
              else if (i === chosen) cls = 'border-rose-300 bg-rose-50 text-rose-800'
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => select(i)}
                className={`${base} ${cls}`}
              >
                <span className={q.kind === 'en-ja' ? 'font-jp text-lg' : ''}>
                  {opt.label}
                </span>
                {opt.sub && (
                  <span className="ml-2 font-jp text-sm font-normal text-slate-500">
                    {opt.sub}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={next}
            disabled={chosen === null}
            className={`rounded-xl px-5 py-2.5 font-semibold text-white transition ${
              chosen === null
                ? 'bg-slate-200 text-slate-400'
                : isWrong
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : isCorrect
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {chosen === null ? 'Select an answer' : idx + 1 >= questions.length ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
