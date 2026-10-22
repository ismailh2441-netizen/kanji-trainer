import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AuthErrorScreen, AuthLoading } from './AuthScreens'

export default function RequireAuth() {
  const { status, error, retry, signOut } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <AuthLoading message="Loading your progress from the cloud…" />
  }

  if (status === 'signedOut') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (status === 'error') {
    return (
      <AuthErrorScreen
        message={error ?? 'Your progress could not be loaded.'}
        onRetry={() => void retry()}
        onSignOut={() => void signOut()}
      />
    )
  }

  return <Outlet />
}
