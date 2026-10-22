export function AuthLoading({ message = 'Loading your progress…' }: { message?: string }) {
  return (
    <div className="grid min-h-svh place-items-center bg-[#f7f7fb] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-indigo-600 font-jp text-2xl text-white shadow-sm">
          漢
        </span>
        <div
          className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-500" role="status">
          {message}
        </p>
      </div>
    </div>
  )
}

export function AuthErrorScreen({
  message,
  onRetry,
  onSignOut,
}: {
  message: string
  onRetry?: () => void
  onSignOut?: () => void
}) {
  return (
    <div className="grid min-h-svh place-items-center bg-[#f7f7fb] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-rose-100 text-xl font-bold text-rose-700">
          !
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Couldn&apos;t load your account</h1>
        <p className="mt-2 break-words text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Try again
            </button>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
