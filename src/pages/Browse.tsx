import { useState } from 'react'
import { useScopedDeck } from '../hooks/useScopedDeck'
import { useLevel } from '../hooks/useLevel'
import { cardStatusLabel } from '../lib/levels'
import { useProgress } from '../lib/storage'
import { Link } from 'react-router-dom'
import { normalizeReading as normalize } from '../lib/kana'

export default function Browse() {
  const level = useLevel()
  const { deck } = useScopedDeck(level ?? 'n5')
  const progress = useProgress()
  const [q, setQ] = useState('')
  const lp = level ? progress.levels[level] : undefined

  if (!level) return null

  const filtered = deck
    ? deck.filter((e) => {
        const s = normalize(q)
        if (!s) return true
        return (
          e.kanji.includes(q) ||
          e.meanings.some((m) => normalize(m).includes(s)) ||
          e.kun.some((k) => normalize(k).includes(s)) ||
          e.on.some((o) => normalize(o).includes(s))
        )
      })
    : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search kanji, meaning, reading…"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-12 gap-4 border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <div className="col-span-2 sm:col-span-1">Kanji</div>
          <div className="col-span-4 sm:col-span-3">Meanings</div>
          <div className="col-span-6 sm:col-span-4">Readings</div>
          <div className="hidden sm:col-span-2 sm:block">Strokes</div>
          <div className="hidden sm:col-span-2 sm:block">Status</div>
        </div>
        {filtered.map((e) => {
          const card = lp?.cards[e.kanji]
          return (
            <div
              key={e.kanji}
              className="grid grid-cols-12 items-start gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-0"
            >
              <div className="col-span-2 sm:col-span-1 font-jp text-2xl text-slate-900">{e.kanji}</div>
              <div className="col-span-4 sm:col-span-3 text-slate-700">{e.meanings.slice(0, 2).join(', ')}</div>
              <div className="col-span-6 space-y-0.5 sm:col-span-4">
                <div>
                  <span className="mr-1 text-xs text-slate-400">On</span>
                  <span className="font-jp text-slate-700">{e.on.slice(0, 3).join(' · ') || '—'}</span>
                </div>
                <div>
                  <span className="mr-1 text-xs text-slate-400">Kun</span>
                  <span className="font-jp text-slate-700">{e.kun.slice(0, 3).join(' · ') || '—'}</span>
                </div>
              </div>
              <div className="hidden sm:col-span-2 sm:block text-slate-500">{e.strokes}</div>
              <div className="hidden items-center gap-2 sm:col-span-2 sm:flex">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{cardStatusLabel(card)}</span>
                <Link to={`/${level}/write`} className="text-xs text-indigo-600 hover:underline">
                  Write
                </Link>
              </div>
            </div>
          )
        })}
        {!deck && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">Loading deck…</div>
        )}
        {deck && filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">No results</div>
        )}
      </div>
    </div>
  )
}
