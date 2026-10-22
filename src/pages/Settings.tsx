import { useState } from 'react'
import { setNewPerDay, useProgress, exportProgress, importProgress, resetAll, resetLevel } from '../lib/storage'
import { LEVELS, LEVEL_LABEL } from '../lib/levels'

export default function Settings() {
  const progress = useProgress()
  const [limit, setLimit] = useState(String(progress.settings.newPerDay))
  const [msg, setMsg] = useState<string | null>(null)

  function saveLimit() {
    const n = Number(limit)
    if (isNaN(n) || n < 1 || n > 40) {
      setMsg('Limit must be between 1 and 40.')
      setTimeout(() => setMsg(null), 2000)
      return
    }
    setNewPerDay(n)
    setMsg('Saved.')
    setTimeout(() => setMsg(null), 2000)
  }

  function doExport() {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kanji-trainer-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Backup downloaded.')
    setTimeout(() => setMsg(null), 2000)
  }

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const text = await f.text()
    if (importProgress(text)) {
      setMsg('Backup imported.')
      setTimeout(() => setMsg(null), 2000)
    } else {
      setMsg('Invalid backup file.')
      setTimeout(() => setMsg(null), 2000)
    }
    e.target.value = ''
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

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
        <p className="mt-1 text-sm text-slate-500">Export or import your SRS progress as JSON.</p>
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
                setMsg(`Reset ${LEVEL_LABEL[l]} progress.`)
                setTimeout(() => setMsg(null), 2000)
              }}
              className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Reset {LEVEL_LABEL[l]}
            </button>
          ))}
          <button
            onClick={() => {
              resetAll()
              setMsg('Reset all progress.')
              setTimeout(() => setMsg(null), 2000)
            }}
            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Reset everything
          </button>
        </div>
      </div>

      {msg && <div className="text-sm text-slate-600">{msg}</div>}
    </div>
  )
}
