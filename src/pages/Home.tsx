import { Link } from 'react-router-dom'
import { levelTotals } from '../data/meta'
import { LEVELS, LEVEL_LABEL, LEVEL_NAME, LEVEL_THEME, levelStats } from '../lib/levels'
import { useProgress } from '../lib/storage'

export default function Home() {
  const progress = useProgress()
  const now = Date.now()
  const totalDue = LEVELS.reduce((sum, l) => sum + levelStats(progress, l, levelTotals[l], now).due, 0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Learn kanji, one level at a time
          </h1>
          <p className="mt-2 max-w-xl text-slate-600">
            Spaced-repetition flashcards, reading quizzes and stroke-order writing practice —
            organized by JLPT level. Pick a level to begin.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          {progress.streak.count > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <div className="text-xs text-slate-500">Streak</div>
              <div className="font-bold text-slate-900">
                {progress.streak.count} day{progress.streak.count === 1 ? '' : 's'}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="text-xs text-slate-500">Due today</div>
            <div className="font-bold text-slate-900">{totalDue}</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((level) => {
          const theme = LEVEL_THEME[level]
          const stats = levelStats(progress, level, levelTotals[level], now)
          const pct = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0
          const started = stats.known > 0
          return (
            <Link
              key={level}
              to={`/${level}`}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${theme.badge}`}>
                    {LEVEL_LABEL[level]}
                  </span>
                  <div className="mt-2 font-bold text-slate-900">{LEVEL_NAME[level]}</div>
                </div>
                <div className={`text-2xl font-bold ${theme.text}`}>{pct}%</div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${theme.bar} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="text-sm text-slate-500">
                {stats.total} kanji · {stats.learned} learned
              </div>

              <div className="mt-auto flex items-center gap-2 pt-1">
                {stats.due > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    {stats.due} due
                  </span>
                )}
                {stats.newAvailable > 0 && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                    {stats.newAvailable} new
                  </span>
                )}
                <span className="ml-auto text-sm font-semibold text-indigo-600 group-hover:underline">
                  {started ? 'Continue' : 'Start'} →
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
