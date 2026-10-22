import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useSyncStatus } from '../lib/sync'

export default function Layout() {
  const { user } = useAuth()
  const sync = useSyncStatus()

  const syncLabel =
    sync.state === 'error'
      ? 'Sync issue'
      : sync.state === 'saving'
        ? 'Saving…'
        : sync.state === 'syncing'
          ? 'Syncing…'
          : 'Synced'
  const syncDot =
    sync.state === 'error'
      ? 'bg-rose-500'
      : sync.state === 'saving' || sync.state === 'syncing'
        ? 'bg-amber-400'
        : 'bg-emerald-500'

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-slate-900">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 font-jp text-white">
              漢
            </span>
            Kanji Trainer
          </Link>
          <div className="flex items-center gap-1.5">
            <div
              className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-500 sm:flex"
              title={sync.error ?? user?.email ?? syncLabel}
              aria-live="polite"
            >
              <span className={`size-2 rounded-full ${syncDot}`} aria-hidden="true" />
              <span>{syncLabel}</span>
            </div>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 font-medium transition ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                Levels
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 font-medium transition ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                Settings
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs leading-5 text-slate-500">
          Vocabulary &amp; example data from{' '}
          <a
            className="underline hover:text-slate-700"
            href="https://www.kanjitest.online/"
            target="_blank"
            rel="noreferrer"
          >
            kanjitest.online
          </a>{' '}
          (MIT). Stroke-order data from{' '}
          <a
            className="underline hover:text-slate-700"
            href="https://kanjivg.tagaini.net/"
            target="_blank"
            rel="noreferrer"
          >
            KanjiVG
          </a>
          , © Ulrich Apel,{' '}
          <a
            className="underline hover:text-slate-700"
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 3.0
          </a>
          .
        </div>
      </footer>
    </div>
  )
}
