import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { POI } from '../types'
import { placesApi, checkinsApi } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'
import { OSMContribution } from '../components/OSMContribution'
import { getCategoryIcon, getCategoryLabel, ContactIcons, UIIcons } from '../utils/icons'

export function PlaceDetails() {
  const { osmType, osmId } = useParams<{ osmType: string; osmId: string }>()
  const navigate = useNavigate()
  const { latitude, longitude } = useGeolocation()
  const [poi, setPoi] = useState<POI | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [showCheckInForm, setShowCheckInForm] = useState(false)
  const [osmContributionExpanded, setOsmContributionExpanded] = useState(false)

  const fetchPlaceDetails = useCallback(async (type: string, id: number) => {
    try {
      setLoading(true)
      setError(null)
      const poiData = await placesApi.getDetails(type, id)
      setPoi(poiData)
    } catch (err) {
      setError('Failed to load place details')
      console.error('Error fetching place details:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (osmType && osmId) {
      void fetchPlaceDetails(osmType, Number(osmId))
    }
  }, [fetchPlaceDetails, osmType, osmId])

  const handleCheckIn = async () => {
    if (!poi) return

    try {
      setCheckinLoading(true)

      await checkinsApi.create({
        poi_osm_type: poi.osm_type,
        poi_osm_id: poi.osm_id,
        comment: comment.trim() || undefined,
        user_lat: latitude || undefined,
        user_lon: longitude || undefined,
      })

      // Navigate to check-ins history
      navigate('/checkins')
    } catch (err) {
      console.error('Check-in failed:', err)
      // Show error - in a real app, you'd use a toast notification
      alert('Check-in failed. Please try again.')
    } finally {
      setCheckinLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  if (error || !poi) {
    return (
      <div className="text-center p-6">
        <div className="text-gray-600 mb-4">{UIIcons.error({ size: 56 })}</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {error || 'Place not found'}
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">Place Details
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Place Info */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="text-gray-600">{getCategoryIcon(poi.class || poi.category || 'misc', { size: 28 })}</div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {poi.name || 'Unnamed Location'}
              </h2>
              <p className="text-gray-600">
                {getCategoryLabel(poi.class || poi.category)}
              </p>
            </div>
          </div>

          {poi.address && (
            <div className="flex items-start space-x-3">
              <span className="text-gray-400 mt-1">{ContactIcons.location({ size: 18 })}</span>
              <p className="text-gray-700">{poi.address}</p>
            </div>
          )}

          {poi.phone && (
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">{ContactIcons.phone({ size: 18 })}</span>
              <a
                href={`tel:${poi.phone}`}
                className="text-primary-600 hover:underline"
              >
                {poi.phone}
              </a>
            </div>
          )}

          {poi.website && (
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">{ContactIcons.website({ size: 18 })}</span>
              <a
                href={poi.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Visit Website
              </a>
            </div>
          )}

          {poi.opening_hours && (
            <div className="flex items-start space-x-3">
              <span className="text-gray-400 mt-1">{ContactIcons.hours({ size: 18 })}</span>
              <p className="text-gray-700">{poi.opening_hours}</p>
            </div>
          )}

          {/* View on Map */}
          <div className="flex items-center space-x-3">
            <span className="text-gray-400">{ContactIcons.map({ size: 18 })}</span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${poi.lat}&mlon=${poi.lon}&zoom=18`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              View on OpenStreetMap
            </a>
          </div>
        </div>

        {/* OSM Contribution Section */}
        <OSMContribution
          osmType={poi.osm_type}
          osmId={poi.osm_id}
          tags={poi.tags}
          isExpanded={osmContributionExpanded}
          onToggleExpanded={setOsmContributionExpanded}
        />

        {/* Check-in Section */}
        <div className="border-t border-gray-200 pt-6">
          {!showCheckInForm ? (
            <button
              onClick={() => setShowCheckInForm(true)}
              className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Check In Here
            </button>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Check In</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was your visit? Any tips for other visitors?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {comment.length}/500 characters
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCheckInForm(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckIn}
                  disabled={checkinLoading}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {checkinLoading ? 'Checking in...' : 'Check In'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
