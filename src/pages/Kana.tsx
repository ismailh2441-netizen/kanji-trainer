import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { HIRAGANA, KATAKANA, type KanaCell, type KanaChart, type KanaRow } from '../data/kana'
import { useLevel } from '../hooks/useLevel'
import { useStrokes } from '../hooks/useDeck'
import WritingPractice from '../components/WritingPractice'

type Script = 'hiragana' | 'katakana'
type QuizMode = 'kana-to-romaji' | 'romaji-to-kana'
type View = 'chart' | 'quiz' | 'write'

interface QuizQuestion {
  prompt: string
  answer: string
  options: string[]
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function allCells(chart: KanaChart): KanaCell[] {
  return [...chart.basic, ...chart.voiced]
    .flatMap((row) => row.cells)
    .filter((cell): cell is KanaCell => cell !== null)
}

function buildQuiz(pool: KanaCell[], mode: QuizMode, count = 10): QuizQuestion[] {
  const key = mode === 'kana-to-romaji' ? 'romaji' : 'kana'
  return shuffle(pool)
    .slice(0, Math.min(count, pool.length))
    .map((cell) => {
      const distractors = shuffle(pool.filter((c) => c[key] !== cell[key])).slice(0, 3)
      return {
        prompt: mode === 'kana-to-romaji' ? cell.kana : cell.romaji,
        answer: cell[key],
        options: shuffle([cell, ...distractors].map((c) => c[key])),
      }
    })
}

function ChartGroup({
  title,
  rows,
  hideRomaji,
  onSelect,
}: {
  title: string
  rows: KanaRow[]
  hideRomaji: boolean
  onSelect: (cell: KanaCell) => void
}) {
  const cellClass =
    'flex aspect-square flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm'
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid grid-cols-[1.5rem_repeat(5,minmax(0,1fr))] gap-1.5">
        {rows.map((row, rowIndex) => (
          <Fragment key={rowIndex}>
            <div className="flex items-center justify-center text-[11px] font-semibold text-slate-400">
              {row.label}
            </div>
            {row.cells.map((cell, cellIndex) =>
              cell ? (
                <button
                  key={cellIndex}
                  type="button"
                  onClick={() => onSelect(cell)}
                  title={`Practise writing ${cell.kana}`}
                  aria-label={`Practise writing ${cell.kana} (${cell.romaji})`}
                  className={`${cellClass} transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
                >
                  <span className="font-jp text-2xl leading-none text-slate-900">{cell.kana}</span>
                  {!hideRomaji && <span className="mt-1 text-[11px] text-slate-500">{cell.romaji}</span>}
                </button>
              ) : (
                <div key={cellIndex} className={cellClass} />
              ),
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export default function Kana() {
  const level = useLevel()
  const [script, setScript] = useState<Script>('hiragana')
  const [hideRomaji, setHideRomaji] = useState(false)
  const [view, setView] = useState<View>('chart')
  const [mode, setMode] = useState<QuizMode>('kana-to-romaji')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  const [writeIndex, setWriteIndex] = useState(0)

  const chart = script === 'hiragana' ? HIRAGANA : KATAKANA
  const writeCells = allCells(chart)
  const safeWriteIndex = Math.min(writeIndex, writeCells.length - 1)
  const writeCell = writeCells[safeWriteIndex]
  const { strokes, loading } = useStrokes(view === 'write' ? (writeCell?.kana ?? null) : null)

  if (!level) return null

  if (level !== 'n5') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Kana practice is part of N5</h2>
        <p className="mt-1 text-slate-500">
          Hiragana and katakana are introduced in the beginner level.
        </p>
        <Link
          to="/n5/kana"
          className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Open N5 kana
        </Link>
      </div>
    )
  }

  function startQuiz(nextMode: QuizMode) {
    setMode(nextMode)
    setQuestions(buildQuiz(allCells(chart), nextMode))
    setIdx(0)
    setChosen(null)
    setCorrect(0)
    setDone(false)
    setView('quiz')
  }

  function openWriting(cell: KanaCell) {
    const index = writeCells.findIndex((c) => c.kana === cell.kana)
    setWriteIndex(index >= 0 ? index : 0)
    setView('write')
  }

  function answer(option: string) {
    if (chosen !== null) return
    setChosen(option)
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

  if (view === 'quiz' && questions.length > 0) {
    if (done) {
      const pct = Math.round((correct / questions.length) * 100)
      return (
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
            {pct}%
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Kana quiz complete</h2>
          <p className="mt-1 text-slate-500">
            {correct} correct out of {questions.length}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setView('chart')}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to charts
            </button>
            <button
              type="button"
              onClick={() => startQuiz(mode)}
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
    const optionsAreKana = mode === 'romaji-to-kana'

    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startQuiz('kana-to-romaji')}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                mode === 'kana-to-romaji'
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Kana → Romaji
            </button>
            <button
              type="button"
              onClick={() => startQuiz('romaji-to-kana')}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                mode === 'romaji-to-kana'
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Romaji → Kana
            </button>
          </div>
          <div className="text-sm text-slate-500">
            Question {idx + 1} / {questions.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <div
              className={
                optionsAreKana
                  ? 'text-5xl font-bold tracking-wide text-slate-900'
                  : 'font-jp text-7xl text-slate-900'
              }
            >
              {q.prompt}
            </div>
            <div className="mt-3 text-sm text-slate-500">
              {optionsAreKana ? 'Choose the matching kana' : 'Choose the matching romaji'}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {q.options.map((option) => {
              let cls = 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              if (chosen !== null) {
                if (option === q.answer) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800'
                else if (option === chosen) cls = 'border-rose-300 bg-rose-50 text-rose-800'
              }
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => answer(option)}
                  className={`rounded-xl border px-4 py-3 font-semibold transition ${cls} ${
                    optionsAreKana ? 'font-jp text-2xl' : 'text-lg'
                  }`}
                >
                  {option}
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

        <button
          type="button"
          onClick={() => setView('chart')}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back to charts
        </button>
      </div>
    )
  }

  if (view === 'write' && writeCell) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">
              {script === 'hiragana' ? 'Hiragana' : 'Katakana'} · Writing ·{' '}
              {safeWriteIndex + 1}/{writeCells.length}
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <h2 className="font-jp text-4xl font-bold text-slate-900">{writeCell.kana}</h2>
              <span className="text-slate-500">{writeCell.romaji}</span>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {strokes ? `${strokes.length} stroke${strokes.length === 1 ? '' : 's'}` : '…'}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <WritingPractice kanji={writeCell.kana} strokes={strokes} loading={loading} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setWriteIndex(Math.max(0, safeWriteIndex - 1))}
            disabled={safeWriteIndex === 0}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setView('chart')}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to charts
          </button>
          <button
            type="button"
            onClick={() => setWriteIndex(Math.min(writeCells.length - 1, safeWriteIndex + 1))}
            disabled={safeWriteIndex >= writeCells.length - 1}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400"
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['hiragana', 'katakana'] as Script[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScript(s)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                script === s
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s === 'hiragana' ? 'Hiragana ひらがな' : 'Katakana カタカナ'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHideRomaji((value) => !value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {hideRomaji ? 'Show romaji' : 'Hide romaji'}
          </button>
          <button
            type="button"
            onClick={() => {
              setWriteIndex(0)
              setView('write')
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Writing
          </button>
          <button
            type="button"
            onClick={() => startQuiz('kana-to-romaji')}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Practice quiz
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Read each row across the five vowels. Hide the romaji when you want to test your memory,
        then try the recognition quiz — or tap any kana to practise its stroke order.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <ChartGroup
          title="Basic"
          rows={chart.basic}
          hideRomaji={hideRomaji}
          onSelect={openWriting}
        />
        <div className="mt-6">
          <ChartGroup
            title="Voiced & semi-voiced"
            rows={chart.voiced}
            hideRomaji={hideRomaji}
            onSelect={openWriting}
          />
        </div>
      </div>
    </div>
  )
}
