import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { POI, CheckIn } from '../types'
import { placesApi, checkinsApi } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'
import { POICard } from '../components/POICard'
import { CheckedInStatus } from '../components/CheckedInStatus'
import { UIIcons, NavIcons } from '../utils/icons'
import { IconSearch } from '@tabler/icons-react'

export function Nearby() {
  const navigate = useNavigate()
  const { latitude, longitude, error: locationError, loading: locationLoading, retry } = useGeolocation()
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass] = useState<string>('')
  const [hasNextPage, setHasNextPage] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [lastScrollTime, setLastScrollTime] = useState(0)
  const [currentCheckin, setCurrentCheckin] = useState<CheckIn | null>(null)

  const radius = 1000 // TODO - this should be a constant.

  const fetchNearbyPlaces = useCallback(async (reset = false, pageOverride?: number) => {
    if (!latitude || !longitude) return

    try {
      if (reset) {
        setLoading(true)
        setError(null)
      } else {
        setIsLoadingMore(true)
      }

      const currentPage = reset ? 0 : pageOverride ?? 0
      const limit = 20
      const offset = currentPage * limit

      console.log('Fetching places:', { currentPage, offset, limit, reset })

      const nearbyPois = await placesApi.getNearby({
        lat: latitude,
        lon: longitude,
        radius,
        class: selectedClass || undefined,
        limit,
        offset,
      })

      console.log('API response:', { count: nearbyPois.length, hasMore: nearbyPois.length === limit })

      // Filter out the checked-in POI if it exists in the results
      const filteredPois = nearbyPois.filter(poi => !poi.is_checked_in)

      if (reset) {
        setPois(filteredPois)
        setPage(1)
      } else {
        setPois(prev => [...prev, ...filteredPois])
        setPage(prev => prev + 1)
      }

      // Check if we have more data - only set to false if we get fewer results than requested
      setHasNextPage(nearbyPois.length === limit)
    } catch (err) {
      setError('Failed to load nearby places')
      console.error('Error fetching nearby places:', err)
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }, [latitude, longitude, radius, selectedClass])

  // Fetch current check-in
  const fetchCurrentCheckin = useCallback(async () => {
    try {
      const history = await checkinsApi.getHistory(1, 1)
      if (history.checkins.length > 0) {
        setCurrentCheckin(history.checkins[0])
      } else {
        setCurrentCheckin(null)
      }
    } catch (err) {
      console.error('Error fetching current check-in:', err)
    }
  }, [])

  // Fetch nearby places when location is available
  useEffect(() => {
    if (latitude && longitude) {
      setPage(0)
      setHasNextPage(true)
      void fetchNearbyPlaces(true)
    }
  }, [fetchNearbyPlaces, latitude, longitude, selectedClass])

  // Fetch current check-in on mount
  useEffect(() => {
    void fetchCurrentCheckin()
  }, [fetchCurrentCheckin])

  // Refresh check-in when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      void fetchCurrentCheckin()
      // Also refresh the nearby list to update is_checked_in flags
      if (latitude && longitude) {
        void fetchNearbyPlaces(true)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchCurrentCheckin, fetchNearbyPlaces, latitude, longitude])

  const loadMorePlaces = useCallback(async () => {
    console.log('loadMorePlaces called:', { hasNextPage, isLoadingMore, loading })
    if (!hasNextPage || isLoadingMore || loading) return
    console.log('Loading more places...')
    await fetchNearbyPlaces(false, page)
  }, [fetchNearbyPlaces, hasNextPage, isLoadingMore, loading, page])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const now = Date.now()

    // Debounce scroll events - only process every 200ms
    if (now - lastScrollTime < 200) return
    setLastScrollTime(now)

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    console.log('Scroll event:', {
      scrollTop: Math.round(scrollTop),
      scrollHeight,
      clientHeight,
      distanceFromBottom: Math.round(distanceFromBottom),
      hasNextPage,
      isLoadingMore,
      loading
    })

    // Trigger load more when within 200px of bottom (more generous threshold)
    if (distanceFromBottom <= 200 && hasNextPage && !isLoadingMore && !loading) {
      console.log('Near bottom, triggering load more')
      void loadMorePlaces()
    }
  }

  const handlePOIClick = (poi: POI) => {
    navigate(`/places/${poi.osm_type}/${poi.osm_id}`)
  }

  if (locationLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-6">
        <div className="text-gray-600 mb-4">{NavIcons.nearby({ size: 56 })}</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Getting your location...</h2>
        <p className="text-gray-600 text-center">
          We need to know where you are to find nearby places
        </p>
      </div>
    )
  }

  if (locationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-6">
        <div className="text-gray-600 mb-4">{NavIcons.nearby({ size: 56 })}</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Location needed</h2>
        <p className="text-gray-600 text-center mb-4">{locationError}</p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="pb-20" onScroll={handleScroll} style={{ height: '100vh', overflowY: 'auto' }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 space-y-4 z-10">
        <h1 className="text-xl font-semibold text-gray-900">Nearby Places</h1>
      </div>

      {/* Current Check-in Status */}
      {currentCheckin && (
        <CheckedInStatus
          poi={currentCheckin.poi}
          checkedInAt={currentCheckin.created_at}
          onClick={() => navigate(`/places/${currentCheckin.poi.osm_type}/${currentCheckin.poi.osm_id}`)}
        />
      )}

      {/* Debug Info - Only show in development */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-100 p-2 text-xs">
          <strong>Debug:</strong> Page: {page}, HasNext: {hasNextPage.toString()}, Loading: {isLoadingMore.toString()}, POIs: {pois.length}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {loading ? (
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
              onClick={() => fetchNearbyPlaces()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : pois.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-600 mb-4"><IconSearch size={48} /></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nothing here.</h3>
            <p className="text-gray-600">
              At least according to OSM. You can help by adding places around you!
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {pois.map((poi) => (
                <POICard
                  key={`${poi.osm_type}-${poi.osm_id}`}
                  poi={poi}
                  onClick={() => handlePOIClick(poi)}
                />
              ))}
            </div>

            {/* Load more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <svg className="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}

            {/* Debug button for testing load more */}
            {hasNextPage && (
              <div className="text-center py-4">
                <button
                  onClick={loadMorePlaces}
                  disabled={isLoadingMore || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More (Debug)'}
                </button>
              </div>
            )}

            {/* No more results indicator */}
            {!hasNextPage && pois.length > 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">You&apos;ve reached the end.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
