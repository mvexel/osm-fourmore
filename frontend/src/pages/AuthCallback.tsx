import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'

export function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        if (!cancelled) setError('Authentication was cancelled or failed')
        setTimeout(() => !cancelled && navigate('/login'), 3000)
        return
      }

      if (!code) {
        if (!cancelled) setError('No authorization code received')
        setTimeout(() => !cancelled && navigate('/login'), 3000)
        return
      }

      try {
        const authData = await authApi.handleCallback(code)
        if (!cancelled) {
          login(authData.access_token, authData.user)
          navigate('/nearby')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        if (!cancelled) {
          setError('Failed to complete authentication')
          setTimeout(() => !cancelled && navigate('/login'), 3000)
        }
      }
    }

    handleCallback()

    return () => {
      cancelled = true
    }
  }, [searchParams, navigate, login])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {error ? (
          <div className="space-y-4">
            <div className="text-6xl">😞</div>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Failed</h2>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">🔐</div>
            <h2 className="text-xl font-semibold text-gray-900">Completing Sign In</h2>
            <p className="text-gray-600">Please wait while we finish setting up your account...</p>
            <div className="flex justify-center">
              <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}