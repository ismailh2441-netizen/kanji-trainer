import { Link, useParams } from 'react-router-dom'
import { useDeck } from '../hooks/useDeck'
import { useLevel } from '../hooks/useLevel'
import { cardStatusLabel } from '../lib/levels'
import { levelSections } from '../lib/sections'
import { useProgress } from '../lib/storage'

export default function SectionDetail() {
  const level = useLevel()
  const progress = useProgress()
  const { deck } = useDeck(level ?? 'n5')
  const { sectionId } = useParams()

  if (!level) return null

  if (!deck) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        Loading deck…
      </div>
    )
  }

  const id = Number.parseInt(sectionId ?? '', 10)
  const section = levelSections(level, deck).find((s) => s.id === id)

  if (!section) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Section not found</h2>
        <Link
          to={`/${level}/sections`}
          className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to sections
        </Link>
      </div>
    )
  }

  const cards = progress.levels[level].cards
  const now = Date.now()
  const known = section.kanji.filter((k) => cards[k] !== undefined)
  const learned = known.filter((k) => cards[k].state !== 'learning').length
  const due = known.filter((k) => cards[k].due <= now).length
  const fresh = section.kanji.length - known.length

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="text-sm text-slate-500">
          <Link to={`/${level}/sections`} className="hover:text-slate-800">
            Sections
          </Link>{' '}
          / Section {section.id}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Section {section.id}</h1>
          <span className="text-sm text-slate-500">{section.kanji.length} kanji</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Learned</div>
          <div className="text-2xl font-bold text-slate-900">{learned}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Due now</div>
          <div className="text-2xl font-bold text-slate-900">{due}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">New</div>
          <div className="text-2xl font-bold text-slate-900">{fresh}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {section.kanji.map((k) => {
            const card = cards[k]
            const learnedNow = card !== undefined && card.state !== 'learning'
            const dueNow = card !== undefined && card.due <= now
            const cls = !card
              ? 'border-slate-200 bg-slate-50 text-slate-500'
              : dueNow
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : learnedNow
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-indigo-300 bg-indigo-50 text-indigo-800'
            return (
              <div
                key={k}
                title={cardStatusLabel(card, now)}
                className={`rounded-xl border px-2 py-2 text-center ${cls}`}
              >
                <div className="font-jp text-xl leading-tight">{k}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
                  {!card ? 'New' : dueNow ? 'Due' : learnedNow ? 'Done' : 'Learning'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to={`/${level}/review?section=${section.id}`}
          className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-indigo-500"
        >
          Study this section
        </Link>
        <Link
          to={`/${level}/quiz?section=${section.id}`}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Quiz this section
        </Link>
      </div>

      <div className="text-center">
        <Link
          to={`/${level}/review?section=${section.id}&practice=1`}
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          Practice this section again — all cards, even when nothing is due
        </Link>
      </div>
    </div>
  )
}
