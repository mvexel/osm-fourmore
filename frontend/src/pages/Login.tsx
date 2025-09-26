import { useState } from 'react'
import { authApi } from '../services/api'
import { IconBook, IconCheck, IconMapPin2, IconMoodSmile, } from '@tabler/icons-react'

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
            Yes we're still looking for a better name...
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Hey there traveler!
            </h2>
            <p className="text-gray-600">
              FourMore lets you keep track of places you visit and help improve OpenStreetMap in the process!
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span><IconMapPin2 /></span>
              <span>Find nearby places from OpenStreetMap data</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span><IconCheck /></span>
              <span>Check in to places you visit</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span><IconBook /></span>
              <span>Keep a life log of your adventures</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span><IconMoodSmile /></span>
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
                Sign in with OpenStreetMap
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            FourMore requires an OpenStreetMap account to log in. An account with that username is then created for you on FourMore. We do not know or store your OpenStreetMap password. Your check-ins are private unless you choose to share them. Feedback is welcome! Send your thoughts to m@rtijn.org
          </p>
        </div>
      </div>
    </div>
  )
}