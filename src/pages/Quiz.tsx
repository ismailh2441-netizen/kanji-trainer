import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDeck } from '../hooks/useDeck'
import { useScopedDeck } from '../hooks/useScopedDeck'
import { useLevel } from '../hooks/useLevel'
import { buildQuiz, QUIZ_KIND_LABEL, type QuizKind, type QuizQuestion } from '../lib/quiz'
import { useProgress } from '../lib/storage'

const KINDS: QuizKind[] = ['meaning', 'reading']

export default function Quiz() {
  const level = useLevel()
  const { deck: fullDeck } = useDeck(level ?? 'n5')
  const { deck, section } = useScopedDeck(level ?? 'n5')
  const progress = useProgress()
  const location = useLocation()

  const [kind, setKind] = useState<QuizKind>('meaning')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!deck || !fullDeck) return
    const qs = buildQuiz(deck, kind, 15, Math.random, fullDeck)
    setQuestions(qs)
    setIdx(0)
    setChosen(null)
    setCorrect(0)
    setDone(false)
  }, [deck, fullDeck, kind, level, progress])

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

  if (!level) return null

  if (!deck || !fullDeck) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Loading deck…</div>
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Not enough examples</h2>
        <p className="mt-1 text-slate-500">
          {section ? `Section ${section.id} needs` : 'This level needs'} more example words
          for the <em>reading</em> quiz.
          Try the meaning quiz instead{section ? ', or clear the section filter.' : ', or switch levels.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                kind === k
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {QUIZ_KIND_LABEL[k].title}
            </button>
          ))}
        </div>
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
            to={`/${level}${location.search}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              const qs = buildQuiz(deck, kind, 15, Math.random, fullDeck)
              setQuestions(qs)
              setIdx(0)
              setChosen(null)
              setCorrect(0)
              setDone(false)
            }}
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                kind === k
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {QUIZ_KIND_LABEL[k].title}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500">
          Question {idx + 1} / {questions.length}
        </div>
      </div>

      <p className="text-sm text-slate-500">{QUIZ_KIND_LABEL[kind].blurb}</p>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {kind === 'meaning' && (
          <div className="text-center">
            <div className="font-jp text-7xl text-slate-900">{q.kanji}</div>
            <div className="mt-3 text-sm text-slate-500">Pick the meaning</div>
          </div>
        )}
        {kind === 'reading' && (
          <div className="text-center">
            <div className="font-jp text-5xl text-slate-900">{q.word}</div>
            <div className="mt-2 text-sm text-slate-500">
              How is <span className="font-jp">{q.word}</span> read?
            </div>
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
                <span className="font-jp">{opt}</span>
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
