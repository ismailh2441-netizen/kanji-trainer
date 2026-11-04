import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { getVocabLesson } from '../data/vocab'
import { useLevel } from '../hooks/useLevel'

export default function VocabWriteQuiz() {
  const level = useLevel()
  const { lessonId } = useParams()
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [feedback, setFeedback] = useState<null | boolean>(null)

  if (!level) return null
  const id = Number.parseInt(lessonId ?? '', 10)
  const lesson = getVocabLesson(level, id)
  if (!lesson) return null

  const words = lesson.words
  const current = words[index]

  const meanings = (english: string) => {
    const idx = english.indexOf(' — ')
    const parts = idx === -1 ? [english] : [english.slice(0, idx), english.slice(idx + 3)]
    const set: string[] = []
    for (const p of parts) {
      for (const seg of p.split(/[\/,]/)) {
        const t = seg.trim().toLowerCase()
        if (t) set.push(t)
      }
    }
    return set
  }

  const submit = () => {
    if (feedback !== null) return
    const accepted = meanings(current.english)
    const ok = accepted.some((m) => m && input.toLowerCase().trim() === m)
    if (ok) setScore((s) => s + 1)
    setFeedback(ok)
  }

  const next = () => {
    if (index + 1 >= words.length) setDone(true)
    else {
      setIndex((i) => i + 1)
      setInput('')
      setFeedback(null)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Finished</h2>
        <p className="mt-1 text-slate-500">
          Score: {score} / {words.length}
        </p>
        <Link
          to={`/${level}/vocab/${lesson.id}`}
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to lesson
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="text-sm text-slate-500">
        {index + 1} / {words.length}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="font-jp text-3xl font-bold text-slate-900">{current.word}</div>
        {current.kanji && (
          <div className="mt-1 font-jp text-sm text-slate-500">{current.kanji}</div>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (feedback === null ? submit() : next())}
          disabled={feedback !== null}
          className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="Type meaning in English or Bangla"
        />
        {feedback !== null && (
          <div className={`mt-2 text-sm font-semibold ${feedback ? 'text-green-600' : 'text-red-600'}`}>
            {feedback ? 'Correct!' : `Wrong. Answer: ${current.english}`}
          </div>
        )}
        <button
          onClick={feedback === null ? submit : next}
          className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {feedback === null ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  )
}