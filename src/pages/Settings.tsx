import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { LEVELS, LEVEL_LABEL } from '../lib/levels'
import {
  exportProgress,
  importProgress,
  resetAll,
  resetLevel,
  setNewPerDay,
  useProgress,
} from '../lib/storage'
import { useSyncStatus } from '../lib/sync'

export default function Settings() {
  const progress = useProgress()
  const { user, signOut, deleteAccount } = useAuth()
  const sync = useSyncStatus()
  const [limit, setLimit] = useState(String(progress.settings.newPerDay))
  const [msg, setMsg] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(null), 2000)
  }

  function saveLimit() {
    const n = Number(limit)
    if (isNaN(n) || n < 1 || n > 40) {
      flash('Limit must be between 1 and 40.')
      return
    }
    setNewPerDay(n)
    flash('Saved.')
  }

  function doExport() {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kanji-trainer-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash('Backup downloaded.')
  }

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const text = await f.text()
    flash(importProgress(text) ? 'Backup imported.' : 'Invalid backup file.')
    e.target.value = ''
  }

  async function doSignOut() {
    setSigningOut(true)
    await signOut()
  }

  async function doDeleteAccount() {
    setDeleting(true)
    setAccountError(null)
    try {
      await deleteAccount()
    } catch (cause) {
      setDeleting(false)
      setAccountError(
        cause instanceof Error ? cause.message : 'Your account could not be deleted.',
      )
    }
  }

  const syncLabel =
    sync.state === 'error'
      ? 'Sync issue'
      : sync.state === 'saving'
        ? 'Saving…'
        : sync.state === 'syncing'
          ? 'Syncing…'
          : sync.lastSyncedAt
            ? `Synced ${new Date(sync.lastSyncedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'Cloud sync'
  const syncBadge =
    sync.state === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : sync.state === 'saving' || sync.state === 'syncing'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-900">Account</div>
            <div className="mt-1 text-sm text-slate-500">
              {user?.is_anonymous
                ? 'Signed in as guest'
                : <>Signed in as <span className="font-medium text-slate-800">{user?.email ?? 'unknown'}</span></>}
            </div>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${syncBadge}`}>
            {syncLabel}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {user?.is_anonymous
            ? 'You are using a guest account. Progress is saved to this device and synced to the cloud for this guest session. To sync across devices or keep progress permanently, sign in with email.'
            : 'Your review progress is saved to your account and synced to every device you sign in to. This browser keeps an offline cache.'}
        </p>

        {sync.error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {sync.error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void doSignOut()}
          disabled={signingOut}
          className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-semibold text-slate-900">Daily new cards</div>
        <p className="mt-1 text-sm text-slate-500">
          How many new kanji to introduce per day. This controls the Review queue.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            inputMode="numeric"
            className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={saveLimit}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-semibold text-slate-900">Progress backup</div>
        <p className="mt-1 text-sm text-slate-500">
          Export or import your SRS progress as JSON. Exports include your cloud-synced progress.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={doExport} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            Export backup
          </button>
          <label className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            Import backup
            <input type="file" accept="application/json" className="hidden" onChange={doImport} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <div className="font-semibold text-red-800">Danger zone</div>
        <p className="mt-1 text-sm text-red-700">These actions cannot be undone.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => {
                resetLevel(l)
                flash(`Reset ${LEVEL_LABEL[l]} progress.`)
              }}
              className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Reset {LEVEL_LABEL[l]}
            </button>
          ))}
          <button
            onClick={() => {
              resetAll()
              flash('Reset all progress.')
            }}
            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Reset everything
          </button>
        </div>

        {!user?.is_anonymous && (
          <div className="mt-5 border-t border-red-200 pt-4">
            <div className="font-semibold text-red-800">Delete account</div>
            <p className="mt-1 text-sm leading-6 text-red-700">
              Permanently deletes your account, sign-in email, and all cloud progress. Export a backup
              first if you might want your progress later.
            </p>

            {confirmDelete ? (
              <div className="mt-3 rounded-xl border border-red-300 bg-white p-4">
                <p className="text-sm font-medium text-red-800">
                  Delete this account and everything in it?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void doDeleteAccount()}
                    disabled={deleting}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    {deleting ? 'Deleting…' : 'Delete my account permanently'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(false)
                      setAccountError(null)
                    }}
                    disabled={deleting}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
                {accountError && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {accountError}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-3 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Delete account…
              </button>
            )}
          </div>
        )}
      </div>

      {msg && <div className="text-sm text-slate-600">{msg}</div>}
    </div>
  )
}
