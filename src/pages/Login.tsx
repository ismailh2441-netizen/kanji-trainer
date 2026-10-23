import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthErrorScreen, AuthLoading } from '../components/AuthScreens'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many sign-in emails were requested. Wait a minute, then try again.'
  }
  if (lower.includes('invalid email')) {
    return 'That email address does not look valid.'
  }
  return message
}

export default function Login() {
  const { status, error, retry, signOut } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [guestLoading, setGuestLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from
  const destination = from && from.startsWith('/') && !from.startsWith('//') ? from : '/'

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  if (!isSupabaseConfigured) {
    return (
      <AuthErrorScreen message={error ?? 'Supabase is not configured for this build.'} />
    )
  }

  if (status === 'loading') {
    return <AuthLoading message="Checking your session…" />
  }

  if (status === 'ready') {
    return <Navigate to={destination} replace />
  }

  if (status === 'error') {
    return (
      <AuthErrorScreen
        message={error ?? 'Your account could not be loaded.'}
        onRetry={() => void retry()}
        onSignOut={() => void signOut()}
      />
    )
  }

  async function requestLink() {
    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setMessage('Enter your email address.')
      return
    }

    setSending(true)
    setMessage(null)
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    })
    setSending(false)

    if (signInError) {
      setMessage(friendlyAuthError(signInError.message))
      return
    }

    setSent(true)
    setCooldown(60)
  }

  function sendLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void requestLink()
  }

  async function continueAsGuest() {
    if (!isSupabaseConfigured) {
      setMessage('Supabase is not configured for this build.')
      return
    }
    setGuestLoading(true)
    setMessage(null)
    const { error: signInError } = await supabase.auth.signInAnonymously()
    setGuestLoading(false)
    if (signInError) {
      setMessage(friendlyAuthError(signInError.message))
      return
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#f7f7fb]">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-indigo-600 font-jp text-2xl text-white shadow-sm">
            漢
          </span>
          <div>
            <div className="text-lg font-bold text-slate-900">Kanji Trainer</div>
            <div className="text-sm text-slate-500">Sign in to sync your progress</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {sent ? (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Check your inbox</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We sent a sign-in link to <span className="font-semibold text-slate-900">{email.trim()}</span>.
                Open it on this device and browser to finish signing in.
              </p>
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                The link expires after one hour. If it doesn&apos;t arrive, check spam, then request a new one.
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {message}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void requestLink()}
                  disabled={sending || cooldown > 0}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false)
                    setMessage(null)
                    setCooldown(0)
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Use a different email
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Enter your email and we&apos;ll send a magic link. No password needed.
              </p>

              <form id="email-form" onSubmit={sendLink} className="mt-5 space-y-3">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Sending link…' : 'Email me a sign-in link'}
                </button>
              </form>

              {message && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {message}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="text-sm font-medium text-slate-700">Or</div>
            <p className="mt-1 text-xs text-slate-500">
              Try without an account. Progress is saved to this device and can sync if you sign in later.
            </p>
            <button
              type="button"
              onClick={() => void continueAsGuest()}
              disabled={guestLoading || sending}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guestLoading ? 'Continuing as guest…' : 'Continue as guest'}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Your progress is saved to your account and available on every device you sign in to.
          You can delete your account at any time in Settings.
        </p>
      </main>

      <footer className="pb-6 text-center text-xs text-slate-400">
        Kanji Trainer · <a className="underline hover:text-slate-600" href="https://kanji-trainer-eight.vercel.app">kanji-trainer-eight.vercel.app</a>
      </footer>
    </div>
  )
}
