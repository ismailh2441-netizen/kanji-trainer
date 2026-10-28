import { Link, useParams } from 'react-router-dom'
import { getVocabLesson } from '../data/vocab'
import { useLevel } from '../hooks/useLevel'

export default function VocabLesson() {
  const level = useLevel()
  const { lessonId } = useParams()

  if (!level) return null

  const id = Number.parseInt(lessonId ?? '', 10)
  const lesson = getVocabLesson(level, id)

  if (!lesson) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Lesson not found</h2>
        <p className="mt-1 text-slate-500">This vocabulary lesson does not exist for this level.</p>
        <Link
          to={`/${level}/vocab`}
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to vocabulary
        </Link>
      </div>
    )
  }

  const verbs = lesson.words.filter((word) => word.group !== undefined).length

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="text-sm text-slate-500">
          <Link to={`/${level}/vocab`} className="hover:text-slate-800">
            Vocabulary
          </Link>{' '}
          / {lesson.title}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{lesson.title}</h1>
          <span className="text-sm text-slate-500">
            {lesson.words.length} words · {verbs} verbs
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-12 gap-4 border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <div className="col-span-7 sm:col-span-6">Japanese</div>
          <div className="col-span-5 sm:col-span-6">English</div>
        </div>
        {lesson.words.map((word) => (
          <div
            key={word.word}
            className="grid grid-cols-12 items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
          >
            <div className="col-span-7 sm:col-span-6">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-jp text-xl font-semibold text-slate-900">
                  {word.word}
                </span>
                {word.kanji && (
                  <span className="font-jp text-sm text-slate-500">{word.kanji}</span>
                )}
                {word.group && (
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                    Group {word.group}
                  </span>
                )}
              </div>
              {word.usage && (
                <div className="mt-1 font-jp text-xs text-slate-500">{word.usage}</div>
              )}
            </div>
            <div className="col-span-5 sm:col-span-6 text-sm text-slate-700">{word.english}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to={`/${level}/vocab/${lesson.id}/quiz`}
          className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-indigo-500"
        >
          Quiz this lesson
        </Link>
        <Link
          to={`/${level}/vocab`}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to vocabulary
        </Link>
      </div>
    </div>
  )
}
