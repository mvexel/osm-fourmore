import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { POI } from '../types'
import { placesApi, checkinsApi } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'
import { POICard } from '../components/POICard'

export function Nearby() {
  const navigate = useNavigate()
  const { latitude, longitude, error: locationError, loading: locationLoading, retry } = useGeolocation()
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [radius, setRadius] = useState(1000)
  const [checkinLoading, setCheckinLoading] = useState<number | null>(null)

  // Fetch nearby places when location is available
  useEffect(() => {
    if (latitude && longitude) {
      fetchNearbyPlaces()
    }
  }, [latitude, longitude, selectedCategory, radius])

  const fetchNearbyPlaces = async () => {
    if (!latitude || !longitude) return

    try {
      setLoading(true)
      setError(null)

      const nearbyPois = await placesApi.getNearby({
        lat: latitude,
        lon: longitude,
        radius,
        category: selectedCategory || undefined,
        limit: 50,
      })

      setPois(nearbyPois)
    } catch (err) {
      setError('Failed to load nearby places')
      console.error('Error fetching nearby places:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (poi: POI) => {
    try {
      setCheckinLoading(poi.id)

      await checkinsApi.create({
        poi_id: poi.id,
        user_lat: latitude || undefined,
        user_lon: longitude || undefined,
      })

      // Show success and redirect to check-in details
      // For now, just navigate to history
      navigate('/checkins')
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
        <div className="text-6xl mb-4">📍</div>
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
        <div className="text-6xl mb-4">📍</div>
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
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Nearby Places</h1>

        {/* Filters */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All categories</option>
              <option value="food">Food & Drinks</option>
              <option value="retail">Shopping</option>
              <option value="entertainment">Entertainment</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="recreation">Recreation</option>
              <option value="services">Services</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distance: {radius < 1000 ? `${radius}m` : `${radius / 1000}km`}
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

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
            <div className="text-4xl mb-4">😞</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchNearbyPlaces}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : pois.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No places found</h3>
            <p className="text-gray-600">
              Try expanding your search radius or changing the category filter.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}