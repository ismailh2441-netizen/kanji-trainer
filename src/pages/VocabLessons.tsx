import { Link } from 'react-router-dom'
import { getVocabLessons } from '../data/vocab'
import { useLevel } from '../hooks/useLevel'

export default function VocabLessons() {
  const level = useLevel()

  if (!level) return null

  const lessons = getVocabLessons(level)

  if (lessons.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No vocabulary lessons yet</h2>
        <p className="mt-1 text-slate-500">
          Vocabulary lessons are being added level by level. N5 is available now.
        </p>
        <Link
          to={`/${level}`}
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Learn useful words lesson by lesson, then quiz yourself on the words in that lesson.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900">{lesson.title}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {lesson.words.length} words
              </span>
            </div>
            <div className="mt-2 truncate font-jp text-lg text-slate-700">
              {lesson.words.slice(0, 5).map((word) => word.word).join(' · ')}
              {lesson.words.length > 5 ? ' …' : ''}
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                to={`/${level}/vocab/${lesson.id}`}
                className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Study words
              </Link>
              <Link
                to={`/${level}/vocab/${lesson.id}/quiz`}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Quiz
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
