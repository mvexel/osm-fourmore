import { useState } from 'react'
import { authApi } from '../services/api'

export function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      const { auth_url } = await authApi.getLoginUrl()
      window.location.href = auth_url
    } catch (err) {
      setError('Failed to start login process. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">FourMore</h1>
          <p className="text-gray-600 text-lg">
            Social check-ins with OpenStreetMap
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome to FourMore
            </h2>
            <p className="text-gray-600">
              Discover places around you and share your experiences while contributing to OpenStreetMap.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span>📍</span>
              <span>Find nearby places from OpenStreetMap data</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span>✅</span>
              <span>Check in to places you visit</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span>📖</span>
              <span>Keep a life log of your adventures</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span>🗺️</span>
              <span>Help improve OpenStreetMap</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <img
                  src="https://www.openstreetmap.org/assets/osm_logo-d59c728e5799e6f91a6b8d6d0b25b99a1d9b4b93d11742b3f43528b03c168b22.svg"
                  alt="OpenStreetMap"
                  className="w-5 h-5 mr-3"
                />
                Sign in with OpenStreetMap
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By signing in, you agree to use your OpenStreetMap account to access FourMore.
            We only access basic profile information.
          </p>
        </div>
      </div>
    </div>
  )
}