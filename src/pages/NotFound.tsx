import { Link, useLocation } from 'react-router-dom'

/**
 * Shown for any URL that does not match a route. Previously unknown paths were
 * silently redirected to the home page, which made a missing/typo'd route look
 * like a broken link (for example an old build that predates a new page).
 */
export default function NotFound() {
  const location = useLocation()

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-xl font-bold text-slate-500">
          404
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-1 text-sm text-slate-500">
          There is no page at <span className="font-mono text-slate-700">{location.pathname}</span>.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          If you just updated the app, reload the page to pick up the latest version.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Back to levels
          </Link>
          <Link
            to="/n5/kana"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            N5 kana
          </Link>
        </div>
      </div>
    </div>
  )
}
