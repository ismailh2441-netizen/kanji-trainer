import { Link, useLocation } from 'react-router-dom'
import ProgressRing from '../components/ProgressRing'
import { useDeck } from '../hooks/useDeck'
import { useLevel } from '../hooks/useLevel'
import { LEVEL_THEME, levelStats } from '../lib/levels'
import { levelTotals } from '../data/meta'
import { useProgress } from '../lib/storage'

const ACTIONS: { to: (l: string) => string; title: string; blurb: string; span?: string }[] = [
  {
    to: (l: string) => `/${l}/review`,
    title: 'Review flashcards',
    blurb: 'Study due cards with spaced repetition.',
  },
  {
    to: (l: string) => `/${l}/quiz`,
    title: 'Quiz',
    blurb: 'Meanings, readings and sentences in context.',
  },
  {
    to: (l: string) => `/${l}/write`,
    title: 'Writing practice',
    blurb: 'Learn stroke order, then trace from memory.',
  },
  {
    to: (l: string) => `/${l}/browse`,
    title: 'Browse kanji',
    blurb: 'Look up any kanji with readings and examples.',
  },
  {
    to: (l: string) => `/${l}/sections`,
    title: 'Sections',
    blurb: 'Study in small batches: pick a section, then study and quiz only its kanji.',
    span: 'sm:col-span-2',
  },
]

export default function Dashboard() {
  const level = useLevel()
  const progress = useProgress()
  const { deck } = useDeck(level ?? 'n5')
  const { search } = useLocation()

  if (!level) return null
  const theme = LEVEL_THEME[level]
  const stats = levelStats(progress, level, levelTotals[level])
  const newUsed = Math.max(0, progress.settings.newPerDay - stats.newAvailable)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing
              value={stats.learned}
              max={stats.total}
              color={theme.fill}
              label="learned"
            />
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Due now</div>
                <div className="text-2xl font-bold text-slate-900">{stats.due}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">New left</div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats.newAvailable}
                  <span className="text-sm font-medium text-slate-400">
                    /{progress.settings.newPerDay}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{newUsed} studied today</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">In progress</div>
                <div className="text-2xl font-bold text-slate-900">{stats.known}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Study streak</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span key={progress.streak.count} className="text-3xl font-bold text-slate-900 animate-count-up">
                {progress.streak.count}
              </span>
              <span className="text-base font-medium text-slate-500">
                day{progress.streak.count === 1 ? '' : 's'}
              </span>
              {progress.streak.count >= 3 && (
                <span className="text-lg animate-bounce" title="Keep it up!">🔥</span>
              )}
            </div>
          </div>
          {stats.due > 0 ? (
            <Link
              to={`/${level}/review`}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-indigo-500 animate-glow-pulse"
            >
              Review {stats.due} card{stats.due === 1 ? '' : 's'}
            </Link>
          ) : (
            <Link
              to={`/${level}/review`}
              className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {deck ? 'Study new cards' : 'Open review'}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.title}
            to={action.to(level) + search}
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${action.span ?? ''}`}
          >
            <div className="font-bold text-slate-900">{action.title}</div>
            <div className="mt-1 text-sm text-slate-500">{action.blurb}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
