import { Link, useParams } from 'react-router-dom'
import { useLevel } from '../hooks/useLevel'
import { getListeningLevel } from '../data/listening/n5'
import { useListeningProgress } from '../lib/listening-storage'

export default function ListeningExercises() {
  const level = useLevel()
  const { listeningLevel } = useParams()
  const listeningProgress = useListeningProgress()

  if (!level) return null

  if (level !== 'n5') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Coming soon</h2>
        <p className="mt-1 text-slate-500">Listening practice is currently only available for N5.</p>
        <Link
          to={`/${level}/listening`}
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>
    )
  }

  const lvlNum = Number.parseInt(listeningLevel ?? '', 10) as 1 | 2 | 3
  const lvl = getListeningLevel(lvlNum)

  if (!lvl) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Level not found</h2>
        <p className="mt-1 text-slate-500">This listening level does not exist.</p>
        <Link
          to={`/${level}/listening`}
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to listening levels
        </Link>
      </div>
    )
  }

  const levelKey = `${level}-l${lvl.id}`
  const completed = listeningProgress.completed[levelKey] || []

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="text-sm text-slate-500">
          <Link to={`/${level}/listening`} className="hover:text-slate-800">
            Listening
          </Link>{' '}
          / {lvl.name}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{lvl.name}</h1>
          <span className="text-sm text-slate-500">{lvl.description}</span>
        </div>
      </div>

      {lvl.exercises.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">No exercises yet. Coming soon!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lvl.exercises.map((exercise, idx) => {
            const isDone = completed.includes(exercise.id)
            return (
              <Link
                key={exercise.id}
                to={`/${level}/listening/${lvl.id}/${exercise.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Exercise {idx + 1}</div>
                    {exercise.hint && <div className="text-sm text-slate-500">{exercise.hint}</div>}
                  </div>
                </div>
                {isDone && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Completed
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}

      <Link
        to={`/${level}/listening`}
        className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Back to levels
      </Link>
    </div>
  )
}
