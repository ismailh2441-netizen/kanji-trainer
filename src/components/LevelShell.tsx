import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useLevel } from '../hooks/useLevel'
import { LEVEL_LABEL, LEVEL_NAME, levelStats } from '../lib/levels'
import { parseSection } from '../lib/sections'
import { levelTotals } from '../data/meta'
import { useProgress } from '../lib/storage'

const TABS = [
  { to: '', label: 'Dashboard', end: true },
  { to: 'sections', label: 'Sections' },
  { to: 'review', label: 'Review', badge: 'due' as const },
  { to: 'quiz', label: 'Quiz' },
  { to: 'write', label: 'Write' },
  { to: 'browse', label: 'Browse' },
]

export default function LevelShell() {
  const progress = useProgress()
  const level = useLevel()
  const location = useLocation()

  if (!level) return <Navigate to="/" replace />

  const stats = levelStats(progress, level, levelTotals[level])

  // Keep the active section (`?section=N`) attached to every tab while one is
  // selected. On a section detail page, the path itself carries the section.
  const pathMatch = /\/sections\/(\d+)\/?$/.exec(location.pathname)
  const paramSection = parseSection(location.search)
  const scope = paramSection ?? (pathMatch ? Number(pathMatch[1]) : null)
  const search = scope ? `?section=${scope}` : ''

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-1 text-sm text-slate-500">
        <Link to="/" className="hover:text-slate-800">
          Levels
        </Link>{' '}
        / {LEVEL_LABEL[level]}
      </div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          {LEVEL_LABEL[level]} · {LEVEL_NAME[level]}
        </h1>
        <span className="text-sm text-slate-500">{stats.total} kanji</span>
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={`${tab.to ? `/${level}/${tab.to}` : `/${level}`}${search}`}
            end={tab.end}
            className={({ isActive }) =>
              `relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`
            }
          >
            {tab.label}
            {tab.badge === 'due' && stats.due > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {stats.due}
              </span>
            )}
          </NavLink>
        ))}
        {paramSection !== null && (
          <span className="ml-2 flex items-center gap-1.5 self-center whitespace-nowrap rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            Section {paramSection}
            <Link
              to={location.pathname}
              className="text-indigo-400 hover:text-indigo-900"
              title="Show all kanji for this level"
            >
              ✕
            </Link>
          </span>
        )}
        <span className="ml-auto hidden self-center pl-4 text-xs text-slate-400 sm:block">
          {stats.learned}/{stats.total} learned
        </span>
      </nav>

      <Outlet />
    </div>
  )
}
