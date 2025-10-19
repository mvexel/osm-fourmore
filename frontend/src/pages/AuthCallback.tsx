import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authApi } from '../services/api'
import { UIIcons } from '../utils/icons'
import { WAITLIST_STORAGE_KEY } from '../constants/auth'

export function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const lastCodeRef = useRef<string | null>(null)

  useEffect(() => {

    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (code && lastCodeRef.current === code) {
        return
      }

      if (error) {
        setError('Authentication was cancelled or failed')
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      if (!code) {
        setError('No authorization code received')
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      try {
        lastCodeRef.current = code
        const authData = await authApi.handleCallback(code)
        login(authData.access_token, authData.user)
        navigate('/nearby')
      } catch (err) {
        lastCodeRef.current = null
        if (isAxiosError(err) && err.response?.status === 403) {
          const detailPayload: unknown = err.response?.data?.detail?.payload
          let message: string | undefined
          let email: string | undefined

          if (typeof detailPayload === 'object' && detailPayload !== null) {
            const detail = detailPayload as { message?: unknown; email?: unknown }
            if (typeof detail.message === 'string') {
              message = detail.message
            }
            if (typeof detail.email === 'string') {
              email = detail.email
            }
          }

          sessionStorage.setItem(
            WAITLIST_STORAGE_KEY,
            JSON.stringify({
              message:
                message ??
                'We are inviting people in waves while we scale up. Drop us an email and we will add you to the list.',
              email: email ?? 'mvexel@gmail.com',
            })
          )
          navigate('/login', { replace: true })
          return
        }

        console.error('Auth callback error:', err)
        setError('Failed to complete authentication')
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    void handleCallback()
  }, [searchParams, navigate, login])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {error ? (
          <div className="space-y-4">
            <div className="text-gray-600">{UIIcons.error({ size: 64 })}</div>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Failed</h2>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center text-primary-600">{UIIcons.secure({ size: 64 })}</div>
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
