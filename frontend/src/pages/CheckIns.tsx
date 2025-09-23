import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckIn } from '../types'
import { checkinsApi } from '../services/api'
import { format, formatDistanceToNow } from 'date-fns'

export function CheckIns() {
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchCheckins()
    fetchStats()
  }, [])

  const fetchCheckins = async (pageNum = 1, reset = true) => {
    try {
      setLoading(true)
      setError(null)

      const response = await checkinsApi.getHistory(pageNum, 20)

      if (reset) {
        setCheckins(response.checkins)
      } else {
        setCheckins(prev => [...prev, ...response.checkins])
      }

      setHasMore(response.checkins.length === 20)
      setPage(pageNum)
    } catch (err) {
      setError('Failed to load check-ins')
      console.error('Error fetching check-ins:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await checkinsApi.getStats()
      setStats(response.data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchCheckins(page + 1, false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return '🍽️'
      case 'retail': return '🛍️'
      case 'entertainment': return '🎬'
      case 'healthcare': return '🏥'
      case 'education': return '🎓'
      case 'finance': return '🏦'
      case 'automotive': return '⛽'
      case 'accommodation': return '🏨'
      case 'recreation': return '⚽'
      case 'government': return '🏛️'
      case 'religion': return '⛪'
      case 'services': return '🔧'
      case 'attractions': return '🗽'
      default: return '📍'
    }
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Your Check-ins</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary-600">
                {stats.total_checkins}
              </div>
              <div className="text-sm text-gray-600">Total Check-ins</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary-600">
                {stats.unique_places}
              </div>
              <div className="text-sm text-gray-600">Unique Places</div>
            </div>
          </div>
          {stats.favorite_category && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600">
                Favorite category: <span className="font-medium capitalize">
                  {stats.favorite_category.replace('_', ' ')}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {loading && checkins.length === 0 ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">😞</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchCheckins()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : checkins.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No check-ins yet</h3>
            <p className="text-gray-600 mb-6">
              Start exploring and checking in to places around you!
            </p>
            <Link
              to="/nearby"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Find Nearby Places
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group by date */}
            {Object.entries(
              checkins.reduce((groups, checkin) => {
                const date = format(new Date(checkin.created_at), 'yyyy-MM-dd')
                if (!groups[date]) groups[date] = []
                groups[date].push(checkin)
                return groups
              }, {} as Record<string, CheckIn[]>)
            ).map(([date, dayCheckins]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 mb-3 sticky top-16 bg-white py-1">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-3">
                  {dayCheckins.map((checkin) => (
                    <div key={checkin.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">
                          {getCategoryIcon(checkin.poi.category)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Link
                              to={`/places/${checkin.poi.id}`}
                              className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                            >
                              {checkin.poi.name || 'Unnamed Location'}
                            </Link>
                            <span className="text-xs text-gray-500">
                              {format(new Date(checkin.created_at), 'h:mm a')}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 capitalize">
                            {checkin.poi.category.replace('_', ' ')}
                          </p>

                          {checkin.poi.address && (
                            <p className="text-sm text-gray-500 line-clamp-1">
                              📍 {checkin.poi.address}
                            </p>
                          )}

                          {checkin.comment && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                              "{checkin.comment}"
                            </div>
                          )}

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(checkin.created_at), { addSuffix: true })}
                            </span>
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${checkin.poi.lat}&mlon=${checkin.poi.lon}&zoom=18`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:underline"
                            >
                              View on Map
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}