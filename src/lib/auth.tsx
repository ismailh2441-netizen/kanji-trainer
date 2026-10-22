import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { deleteCloudAccount } from './cloud'
import { isSupabaseConfigured, supabase } from './supabase'
import { flushSync, startSync, stopSync } from './sync'

export type AuthStatus = 'loading' | 'signedOut' | 'ready' | 'error'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  error: string | null
  retry: () => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Something went wrong while loading your account.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'loading' : 'error',
  )
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  )

  const sessionRef = useRef<Session | null>(null)
  const syncedUserRef = useRef<string | null>(null)
  const startingUserRef = useRef<string | null>(null)
  const runRef = useRef(0)

  const beginForSession = useCallback(async (session: Session) => {
    const nextUser = session.user
    sessionRef.current = session

    if (syncedUserRef.current === nextUser.id) {
      setUser(nextUser)
      setStatus('ready')
      setError(null)
      return
    }
    if (startingUserRef.current === nextUser.id) return

    startingUserRef.current = nextUser.id
    const run = ++runRef.current
    setUser(nextUser)
    setStatus('loading')
    setError(null)

    try {
      await startSync(nextUser.id)
      if (run !== runRef.current) return
      syncedUserRef.current = nextUser.id
      setStatus('ready')
    } catch (cause) {
      if (run !== runRef.current) return
      setStatus('error')
      setError(messageOf(cause))
    } finally {
      if (startingUserRef.current === nextUser.id) startingUserRef.current = null
    }
  }, [])

  const clearSessionState = useCallback(() => {
    runRef.current += 1
    sessionRef.current = null
    syncedUserRef.current = null
    startingUserRef.current = null
    stopSync(true)
    setUser(null)
    setStatus('signedOut')
    setError(null)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return

      if (event === 'SIGNED_OUT') {
        clearSessionState()
        return
      }
      if (!session) {
        setStatus('signedOut')
        return
      }

      sessionRef.current = session
      setUser(session.user)
      // Defer work that calls Supabase APIs until the auth callback returns.
      setTimeout(() => {
        if (!cancelled) void beginForSession(session)
      }, 0)
    })

    supabase.auth.getSession().then(({ data: sessionData, error: sessionError }) => {
      if (cancelled) return
      if (sessionError) {
        setStatus('error')
        setError(sessionError.message)
        return
      }
      if (sessionData.session) {
        void beginForSession(sessionData.session)
      } else {
        setStatus('signedOut')
      }
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [beginForSession, clearSessionState])

  const retry = useCallback(async () => {
    if (!isSupabaseConfigured) return

    setStatus('loading')
    setError(null)
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      setStatus('error')
      setError(sessionError.message)
      return
    }
    if (!data.session) {
      setStatus('signedOut')
      return
    }

    syncedUserRef.current = null
    await beginForSession(data.session)
  }, [beginForSession])

  const signOut = useCallback(async () => {
    await flushSync()
    try {
      await supabase.auth.signOut()
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    }
    clearSessionState()
  }, [clearSessionState])

  const deleteAccount = useCallback(async () => {
    await deleteCloudAccount()

    runRef.current += 1
    sessionRef.current = null
    syncedUserRef.current = null
    startingUserRef.current = null

    // The account is already gone; clear the local token before showing login.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    stopSync(true)
    setUser(null)
    setStatus('signedOut')
    setError(null)
  }, [])

  return (
    <AuthContext.Provider value={{ status, user, error, retry, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
