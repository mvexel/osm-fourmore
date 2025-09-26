import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { checkinsApi } from '../services/api'
import { format } from 'date-fns'
import { NavIcons, ActionIcons } from '../utils/icons'

export function Profile() {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await checkinsApi.getStats()
      setStats(response.data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* User Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto text-primary-600">
              {NavIcons.profile({ size: 40 })}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.display_name || user.username}
              </h2>
              <p className="text-gray-600">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : stats ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Activity</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-primary-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">
                  {stats.total_checkins}
                </div>
                <div className="text-sm text-gray-600">Total Check-ins</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {stats.unique_places}
                </div>
                <div className="text-sm text-gray-600">Unique Places</div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {stats.favorite_category && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Favorite Category:</span>
                  <span className="font-medium capitalize">
                    {stats.favorite_category.replace('_', ' ')}
                  </span>
                </div>
              )}

              {stats.member_since && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-medium">
                    {format(new Date(stats.member_since), 'MMMM yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* OpenStreetMap Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">OpenStreetMap</h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              FourMore uses OpenStreetMap data to provide you with information about places around you.
            </p>
            <div className="space-y-2">
              <a
                href={`https://www.openstreetmap.org/user/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary-600 hover:underline"
              >
                <span className="inline-flex items-center gap-1">{ActionIcons.external({ size: 16 })} View your OSM profile</span>
              </a>
              <a
                href="https://www.openstreetmap.org/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary-600 hover:underline"
              >
                <span className="inline-flex items-center gap-1">{ActionIcons.edit({ size: 16 })} Edit OpenStreetMap</span>
              </a>
              <a
                href="https://www.openstreetmap.org/about"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary-600 hover:underline"
              >
                <span className="inline-flex items-center gap-1">{ActionIcons.info({ size: 16 })} Learn about OpenStreetMap</span>
              </a>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">About FourMore</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              FourMore is a social check-in app that uses OpenStreetMap data to help you discover and share places.
            </p>
            <p>
              By checking in to places, you're building a personal map of your experiences while contributing to the OpenStreetMap community.
            </p>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Version 1.0.0 • Built with <span className="inline-flex items-center text-red-500">{ActionIcons.favoriteFilled({ size: 14 })}</span> for the OSM community
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={logout}
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}