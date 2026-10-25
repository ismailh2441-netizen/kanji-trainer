import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useScopedDeck } from '../hooks/useScopedDeck'
import { useLevel } from '../hooks/useLevel'
import { useStrokes } from '../hooks/useDeck'
import WritingPractice from '../components/WritingPractice'

export default function Write() {
  const level = useLevel()
  const { deck, section } = useScopedDeck(level ?? 'n5')
  const [index, setIndex] = useState(0)
  const safeIndex = deck && deck.length > 0 ? Math.min(index, deck.length - 1) : 0
  const entry = deck?.[safeIndex]
  const { strokes, loading } = useStrokes(entry?.kanji ?? null)

  if (!level) return null

  if (!deck) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Loading deck…</div>
  }

  if (!entry) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No kanji</h2>
        <Link to={`/${level}`} className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm">
          Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">
            Writing{section ? ` · Section ${section.id}` : ''} · {safeIndex + 1}/{deck.length}
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-jp">{entry.kanji}</h2>
          <div className="text-sm text-slate-500">{entry.meanings.join(', ')}</div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {entry.strokes} strokes
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <WritingPractice kanji={entry.kanji} strokes={strokes} loading={loading} />
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setIndex(Math.max(0, safeIndex - 1))}
          disabled={safeIndex === 0}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Prev
        </button>
        <Link to={`/${level}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
          Back to dashboard
        </Link>
        <button
          onClick={() => setIndex(Math.min(deck.length - 1, safeIndex + 1))}
          disabled={safeIndex >= deck.length - 1}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white disabled:bg-slate-200"
        >
          Next
        </button>
      </div>
    </div>
  )
}
