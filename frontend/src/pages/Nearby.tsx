import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { POI } from '../types'
import { placesApi, checkinsApi } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'
import { POICard } from '../components/POICard'
import { UIIcons, NavIcons } from '../utils/icons'
import { IconSearch } from '@tabler/icons-react'

export function Nearby() {
  const navigate = useNavigate()
  const { latitude, longitude, error: locationError, loading: locationLoading, retry } = useGeolocation()
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory] = useState<string>('')
  const [checkinLoading, setCheckinLoading] = useState<number | null>(null)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [lastScrollTime, setLastScrollTime] = useState(0)

  const radius = 1000 // TODO - this should be a constant

  // Fetch nearby places when location is available
  useEffect(() => {
    if (latitude && longitude) {
      // Reset pagination when filters change
      setPage(0)
      setHasNextPage(true)
      fetchNearbyPlaces(true)
    }
  }, [latitude, longitude, selectedCategory])

  const fetchNearbyPlaces = async (reset = false) => {
    if (!latitude || !longitude) return

    try {
      if (reset) {
        setLoading(true)
        setError(null)
      } else {
        setIsLoadingMore(true)
      }

      const currentPage = reset ? 0 : page
      const limit = 20
      const offset = currentPage * limit

      console.log('Fetching places:', { currentPage, offset, limit, reset })

      const nearbyPois = await placesApi.getNearby({
        lat: latitude,
        lon: longitude,
        radius,
        category: selectedCategory || undefined,
        limit,
        offset,
      })

      console.log('API response:', { count: nearbyPois.length, hasMore: nearbyPois.length === limit })

      if (reset) {
        setPois(nearbyPois)
        setPage(1)
      } else {
        setPois(prev => [...prev, ...nearbyPois])
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
  }

  const loadMorePlaces = async () => {
    console.log('loadMorePlaces called:', { hasNextPage, isLoadingMore, loading })
    if (!hasNextPage || isLoadingMore || loading) return
    console.log('Loading more places...')
    await fetchNearbyPlaces(false)
  }

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
      loadMorePlaces()
    }
  }

  const handleCheckIn = async (poi: POI) => {
    try {
      setCheckinLoading(poi.id)

      const checkin = await checkinsApi.create({
        poi_id: poi.id,
        user_lat: latitude || undefined,
        user_lon: longitude || undefined,
      })

      // Navigate to success page with checkin ID
      navigate(`/checkin-success/${checkin.id}`)
    } catch (err) {
      console.error('Check-in failed:', err)
      // You could show a toast notification here
    } finally {
      setCheckinLoading(null)
    }
  }

  const handlePOIClick = (poi: POI) => {
    navigate(`/places/${poi.id}`)
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
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Nearby Places</h1>
      </div>

      {/* Debug Info - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
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
                  key={poi.id}
                  poi={poi}
                  onClick={() => handlePOIClick(poi)}
                  showCheckInButton
                  onCheckIn={() => handleCheckIn(poi)}
                  isCheckingIn={checkinLoading === poi.id}
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
                <p className="text-gray-500 text-sm">You've reached the end.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}