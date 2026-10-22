import { Link } from 'react-router-dom'
import { useDeck } from '../hooks/useDeck'
import { useLevel } from '../hooks/useLevel'
import { LEVEL_THEME } from '../lib/levels'
import { levelSections } from '../lib/sections'
import { useProgress } from '../lib/storage'

export default function Sections() {
  const level = useLevel()
  const progress = useProgress()
  const { deck } = useDeck(level ?? 'n5')

  if (!level) return null
  const theme = LEVEL_THEME[level]

  if (!deck) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        Loading deck…
      </div>
    )
  }

  const sections = levelSections(level, deck)
  const cards = progress.levels[level].cards
  const now = Date.now()

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Learn in small batches: pick a section, study its kanji, then quiz yourself on that
        section only.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const known = s.kanji.filter((k) => cards[k] !== undefined)
          const learned = known.filter((k) => cards[k].state !== 'learning').length
          const due = known.filter((k) => cards[k].due <= now).length
          const pct = Math.round((learned / s.kanji.length) * 100)
          return (
            <Link
              key={s.id}
              to={`/${level}/sections/${s.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Section {s.id}</span>
                {due > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {due} due
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {s.kanji.length} kanji · {known.length} started · {pct}%
              </div>
              <div className="mt-2 truncate font-jp text-lg text-slate-700">
                {s.kanji.slice(0, 6).join(' ')}
                {s.kanji.length > 6 ? ' …' : ''}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: theme.fill }}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
