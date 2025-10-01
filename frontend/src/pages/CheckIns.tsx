import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { CheckIn, CheckinStats } from '../types'
import { checkinsApi } from '../services/api'
import { getCategoryIcon, getCategoryLabel, ContactIcons, UIIcons, NavIcons } from '../utils/icons'

export function CheckIns() {
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CheckinStats | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const fetchCheckins = useCallback(async (pageNum = 1, reset = true) => {
    try {
      if (reset) {
        setLoading(true)
        setError(null)
      } else {
        setIsLoadingMore(true)
      }

      const response = await checkinsApi.getHistory(pageNum, 20)

      if (reset) {
        setCheckins(response.checkins)
      } else {
        setCheckins((prev) => [...prev, ...response.checkins])
      }

      setHasMore(response.checkins.length === response.per_page)
      setPage(pageNum)
    } catch (err) {
      setError('Failed to load check-ins')
      console.error('Error fetching check-ins:', err)
    } finally {
      if (reset) {
        setLoading(false)
      } else {
        setIsLoadingMore(false)
      }
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await checkinsApi.getStats()
      setStats(response)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [])

  useEffect(() => {
    void fetchCheckins(1, true)
    void fetchStats()
  }, [fetchCheckins, fetchStats])

  const loadMore = useCallback(() => {
    if (loading || isLoadingMore || !hasMore) {
      return
    }
    void fetchCheckins(page + 1, false)
  }, [fetchCheckins, hasMore, isLoadingMore, loading, page])

  const handleEditNotes = (checkin: CheckIn) => {
    setEditingNotes(checkin.id)
    setEditNotes(checkin.comment || '')
  }

  const handleSaveNotes = async (checkinId: number) => {
    try {
      setSavingNotes(true)
      const updatedCheckin = await checkinsApi.update(checkinId, editNotes.trim() || null)

      // Update the checkin in the list
      setCheckins(prev => prev.map(c => c.id === checkinId ? updatedCheckin : c))
      setEditingNotes(null)
    } catch (err) {
      console.error('Error saving notes:', err)
      alert('Failed to save notes. Please try again.')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingNotes(null)
    setEditNotes('')
  }

  const statsContent = useMemo(() => {
    if (!stats) {
      return null
    }

    return (
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
        {stats.favorite_class && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600">
              Favorite category: <span className="font-medium">{getCategoryLabel(stats.favorite_class)}</span>
            </p>
          </div>
        )}
      </div>
    )
  }, [stats])

  const groupedCheckins = useMemo(() => {
    const groups = checkins.reduce<Record<string, CheckIn[]>>((acc, checkin) => {
      const date = format(new Date(checkin.created_at), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(checkin)
      return acc
    }, {})

    return Object.entries(groups)
  }, [checkins])

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Your Check-ins</h1>
      </div>

      {/* Stats */}
      {statsContent}

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
            <div className="text-gray-600 mb-4">{UIIcons.error({ size: 48 })}</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => void fetchCheckins(1, true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : checkins.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center text-gray-600 mb-4">{NavIcons.nearby({ size: 56 })}</div>
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
          <div className="relative space-y-6">
            {/* Centered connecting line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2 z-0"></div>

            {/* Timeline - Group by date */}
            {groupedCheckins.map(([date, dayCheckins]) => (
              <div key={date} className="relative z-10">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 sticky top-16 bg-white py-1 px-2 inline-block left-1/2 -translate-x-1/2">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-3 relative z-20">
                  {dayCheckins.map((checkin, index) => (
                    <div key={checkin.id}>
                      {/* Check-in card */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="text-gray-600 flex-shrink-0">
                            {getCategoryIcon(checkin.poi.class || checkin.poi.category || 'misc', { size: 24 })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/places/${checkin.poi.osm_type}/${checkin.poi.osm_id}`}
                                className="font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-1"
                              >
                                {checkin.poi.name || 'Unnamed Location'}
                              </Link>
                              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                {format(new Date(checkin.created_at), 'h:mm a')}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 mt-0.5">
                              {getCategoryLabel(checkin.poi.class || checkin.poi.category)}
                            </p>

                            {checkin.poi.address && (
                              <p className="text-sm text-gray-500 line-clamp-1 flex items-center gap-1 mt-1">
                                <span className="text-gray-400">{ContactIcons.location({ size: 14 })}</span>
                                <span className="truncate">{checkin.poi.address}</span>
                              </p>
                            )}

                            {/* Notes section */}
                            {editingNotes === checkin.id ? (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  placeholder="Add your notes about this visit..."
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                  rows={3}
                                  maxLength={500}
                                  autoFocus
                                />
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    {editNotes.length}/500
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleCancelEdit}
                                      disabled={savingNotes}
                                      className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveNotes(checkin.id)}
                                      disabled={savingNotes}
                                      className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                    >
                                      {savingNotes ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : checkin.comment ? (
                              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-md group relative">
                                <p className="text-sm text-gray-700 italic">"{checkin.comment}"</p>
                                <button
                                  onClick={() => handleEditNotes(checkin)}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-amber-100 rounded"
                                  title="Edit notes"
                                >
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditNotes(checkin)}
                                className="mt-3 text-sm text-primary-600 hover:text-primary-700 hover:underline"
                              >
                                + Add notes
                              </button>
                            )}

                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className="text-gray-400">
                                {formatDistanceToNow(new Date(checkin.created_at), { addSuffix: true })}
                              </span>
                              <a
                                href={`https://www.openstreetmap.org/${checkin.poi.osm_type}/${checkin.poi.osm_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:underline inline-flex items-center gap-1"
                              >
                                <span className="text-gray-400">{ContactIcons.map({ size: 12 })}</span>
                                View on Map
                              </a>
                            </div>
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
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
