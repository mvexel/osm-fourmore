import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { POI, Quest } from '../types'
import { placesApi, checkinsApi, questsApi } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'
import { OSMContribution } from '../components/OSMContribution'
import { QuestDialog } from '../components/QuestDialog'
import { LocationMap } from '../components/LocationMap'
import { getCategoryIcon, getCategoryLabel, ContactIcons, UIIcons } from '../utils/icons'

export function PlaceDetails() {
  const { osmType, osmId } = useParams<{ osmType: string; osmId: string }>()
  const navigate = useNavigate()
  const { latitude, longitude } = useGeolocation()
  const [poi, setPoi] = useState<POI | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [showCheckInForm, setShowCheckInForm] = useState(false)
  const [osmContributionExpanded, setOsmContributionExpanded] = useState(false)
  const [justCheckedIn, setJustCheckedIn] = useState(false)
  const [quests, setQuests] = useState<Quest[]>([])
  const [showQuestDialog, setShowQuestDialog] = useState(false)
  const [loadingQuests, setLoadingQuests] = useState(false)

  const fetchPlaceDetails = useCallback(async (type: string, id: number) => {
    try {
      setLoading(true)
      setError(null)
      console.log(`Fetching place details for ${type}/${id}`)
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

  const fetchApplicableQuests = async () => {
    if (!poi) return

    try {
      setLoadingQuests(true)
      console.log(`Fetching applicable quests for ${poi.osm_type}/${poi.osm_id}`)
      const result = await questsApi.getApplicable(poi.osm_type, poi.osm_id)
      console.log(`Found ${result.quests.length} applicable quests`)
      setQuests(result.quests)

      if (result.quests.length > 0) {
        setShowQuestDialog(true)
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err)
    } finally {
      setLoadingQuests(false)
    }
  }

  const handleCheckIn = async () => {
    if (!poi || !osmType || !osmId) return

    try {
      setCheckinLoading(true)

      const newCheckin = await checkinsApi.create({
        poi_osm_type: poi.osm_type,
        poi_osm_id: poi.osm_id,
        user_lat: latitude || undefined,
        user_lon: longitude || undefined,
      })

      // Stay on this page and show quests
      setJustCheckedIn(true)
      setShowCheckInForm(false)
      await fetchApplicableQuests()
    } catch (err) {
      console.error('Check-in failed:', err)
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
        </div>

        {/* Interactive Map */}
        <LocationMap lat={poi.lat} lon={poi.lon} name={poi.name} showUserLocation={true} />

        {/* View on Map Link */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-gray-400">{ContactIcons.map({ size: 18 })}</span>
            <a
              href={`https://www.openstreetmap.org/${poi.osm_type}/${poi.osm_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              View on OpenStreetMap
            </a>
          </div>
        </div>


        {/* Success Message */}
        {justCheckedIn && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              {UIIcons.checked_in({ size: 20 })}
              <span className="font-medium">Checked in successfully!</span>
            </div>
          </div>
        )}

        {/* OSM Contribution Section - only show if just checked in */}
        {justCheckedIn && (

          <OSMContribution
            osmType={poi.osm_type}
            osmId={poi.osm_id}
            tags={poi.tags}
            isExpanded={osmContributionExpanded}
            onToggleExpanded={setOsmContributionExpanded}
          />
        )}

        {/* Quest Loading Indicator */}
        {loadingQuests && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3 text-blue-800">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Looking for quests you can complete...</span>
            </div>
          </div>
        )}

        {/* Check-in Section */}
        <div className="border-t border-gray-200 pt-6">
          {!justCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={checkinLoading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              {checkinLoading ? 'Checking in...' : 'Check In'}
            </button>
          ) : null}
        </div>

      </div>

      {/* Quest Dialog */}
      {showQuestDialog && quests.length > 0 && (
        <QuestDialog
          osmType={poi.osm_type}
          osmId={poi.osm_id}
          quests={quests}
          onClose={() => {
            setShowQuestDialog(false)
          }}
          onComplete={() => {
            setQuests([])
          }}
        />
      )}
    </div>
  )
}
