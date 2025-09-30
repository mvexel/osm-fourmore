import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { checkinsApi, usersApi } from '../services/api'
import { NavIcons, ActionIcons, getCategoryLabel } from '../utils/icons'
import { CheckinStats } from '../types'

export function Profile() {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState<CheckinStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const response = await checkinsApi.getStats()
      setStats(response)
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      await checkinsApi.exportCsv()
    } catch (err) {
      console.error('Error exporting CSV:', err)
      alert('Failed to export checkins')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 5000)
      return
    }

    try {
      setIsDeleting(true)
      await usersApi.deleteAccount()
      localStorage.removeItem('fourmore_token')
      localStorage.removeItem('fourmore_user')
      window.location.href = '/login'
    } catch (err) {
      console.error('Error deleting account:', err)
      alert('Failed to delete account')
      setIsDeleting(false)
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
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name || user.username}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm mx-auto"
              />
            ) : (
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto text-primary-600">
                {NavIcons.profile({ size: 40 })}
              </div>
            )}
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
              {stats.favorite_class && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Favorite Category:</span>
                  <span className="font-medium">{getCategoryLabel(stats.favorite_class)}</span>
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
              FourMore lets you "check in" to places you visit, helping you keep track of where you have been. Your check-ins are private and only visible to you.
            </p>
            <p>
              FourMore uses OpenStreetMap data to provide information about places. OpenStreetMap is like the Wikipedia for maps—Anyone can contribute information to it. When you check in to a place with FourMore, you can answer questions about it or add notes to help improve the map for everyone.
            </p>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Version 1.0.0 • Github
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export Check-ins as CSV'}
          </button>

          <button
            onClick={logout}
            className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Sign Out
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className={`w-full py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${deleteConfirm
              ? 'bg-red-700 hover:bg-red-800'
              : 'bg-red-600 hover:bg-red-700'
              }`}
          >
            {isDeleting
              ? 'Deleting...'
              : deleteConfirm
                ? 'Click again to confirm deletion'
                : 'Delete Account & Data'}
          </button>
          {deleteConfirm && (
            <p className="text-sm text-red-600 text-center">
              This will permanently delete your account and all check-ins. This cannot be undone.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
