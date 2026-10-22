import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { EmailOtpType } from '@supabase/supabase-js'
import { AuthLoading } from '../components/AuthScreens'
import { supabase } from '../lib/supabase'

function friendlyCallbackError(message: string): string {
  const lower = message.toLowerCase()
  if (
    lower.includes('code verifier') ||
    lower.includes('pkce') ||
    lower.includes('both auth code')
  ) {
    return 'Open the sign-in link in the same browser where you requested it. Magic links cannot be completed on a different device.'
  }
  if (lower.includes('expired') || lower.includes('invalid')) {
    return 'This sign-in link is invalid or has expired. Request a new one and try again.'
  }
  return message
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function finishSignIn() {
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const errorDescription =
        params.get('error_description') ?? hash.get('error_description')
      if (errorDescription) throw new Error(errorDescription.replace(/\+/g, ' '))

      const code = params.get('code')
      const tokenHash = params.get('token_hash')
      const otpType = params.get('type')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) throw exchangeError
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) throw sessionError
      } else if (tokenHash && otpType) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as EmailOtpType,
        })
        if (otpError) throw otpError
      } else {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!data.session) throw new Error('This sign-in link is missing its code.')
      }

      navigate('/', { replace: true })
    }

    finishSignIn().catch((cause: unknown) => {
      const message =
        cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string'
          ? cause.message
          : 'This sign-in link could not be completed.'
      setError(friendlyCallbackError(message))
    })
  }, [navigate])

  if (!error) {
    return <AuthLoading message="Signing you in…" />
  }

  return (
    <div className="grid min-h-svh place-items-center bg-[#f7f7fb] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-rose-100 text-xl font-bold text-rose-700">
          !
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Sign-in failed</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
        <div className="mt-5 flex justify-center">
          <Link
            to="/login"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Request a new link
          </Link>
        </div>
      </div>
    </div>
  )
}
