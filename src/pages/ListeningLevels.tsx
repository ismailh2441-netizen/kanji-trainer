import { Link } from 'react-router-dom'
import { useLevel } from '../hooks/useLevel'
import { listeningN5 } from '../data/listening/n5'
import { useListeningProgress } from '../lib/listening-storage'

export default function ListeningLevels() {
  const level = useLevel()
  const listeningProgress = useListeningProgress()

  if (!level) return null
  if (level !== 'n5') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Coming soon</h2>
        <p className="mt-1 text-slate-500">Listening practice is currently only available for N5.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Listening Practice</h2>
        <p className="mt-1 text-slate-500">Listen and write in Japanese or English</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listeningN5.map((lvl) => {
          const levelKey = `${level}-l${lvl.id}`
          const completed = (listeningProgress.completed[levelKey] || []).length
          const total = lvl.exercises.length
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0

          return (
            <Link
              key={lvl.id}
              to={`/${level}/listening/${lvl.id}`}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">{lvl.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{lvl.description}</div>
                </div>
                <div className="text-2xl font-bold text-indigo-600">{pct}%</div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="text-sm text-slate-500">
                {completed}/{total} completed
              </div>

              <div className="mt-auto flex items-center gap-2 pt-1">
                <span className="ml-auto text-sm font-semibold text-indigo-600 group-hover:underline">
                  {total === 0 ? 'Coming soon' : completed === 0 ? 'Start' : 'Continue'} →
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
