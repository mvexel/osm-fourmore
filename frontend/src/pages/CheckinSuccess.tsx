import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckIn } from '../types'
import { checkinsApi } from '../services/api'
import { BusinessDetailsCard } from '../components/BusinessDetailsCard'
import { format } from 'date-fns'
import { UIIcons } from '../utils/icons'
import { OSMContribution } from '../components/OSMContribution'

export function CheckinSuccess() {
  const { checkinId } = useParams<{ checkinId: string }>()
  const navigate = useNavigate()
  const [checkin, setCheckin] = useState<CheckIn | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [osmContributionExpanded, setOsmContributionExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  useEffect(() => {
    const fetchCheckinDetails = async () => {
      if (!checkinId || isNaN(Number(checkinId))) {
        setError('Invalid check-in ID')
        setLoading(false)
        return
      }

      try {
        const checkinData = await checkinsApi.getDetails(Number(checkinId))
        setCheckin(checkinData)
        setNotes(checkinData.comment || '')
      } catch (err) {
        console.error('Error fetching check-in details:', err)
        setError('Failed to load check-in details')
      } finally {
        setLoading(false)
      }
    }

    void fetchCheckinDetails()
  }, [checkinId])

  const handleSaveNotes = async () => {
    if (!checkin) return

    try {
      setIsSavingNotes(true)
      const updatedCheckin = await checkinsApi.update(checkin.id, notes.trim() || null)
      setCheckin(updatedCheckin)
    } catch (err) {
      console.error('Error saving notes:', err)
      alert('Failed to save notes. Please try again.')
    } finally {
      setIsSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-6">
        <svg className="animate-spin h-8 w-8 text-primary-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600">Loading check-in details...</p>
      </div>
    )
  }

  if (error || !checkin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-6">
        <div className="text-gray-600 mb-4">{UIIcons.error({ size: 64 })}</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Check-in Not Found</h2>
        <p className="text-gray-600 text-center mb-4">{error || 'This check-in could not be found.'}</p>
        <Link
          to="/nearby"
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Back to Nearby Places
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/places/${checkin.poi.osm_type}/${checkin.poi.osm_id}`)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-gray-900">You're here!</h1>
          <div className="w-6"></div> {/* Spacer for center alignment */}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Success Celebration */}
        <div className="text-center py-6">
          <div className="flex justify-center text-primary-600 mb-3">{UIIcons.success({ size: 64 })}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Checked in successfully!</h2>
          <p className="text-gray-600">
            {format(new Date(checkin.created_at), 'MMM d, yyyy')} at{' '}
            {format(new Date(checkin.created_at), 'h:mm a')}
          </p>
        </div>

        {/* Add Notes Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            Add notes about your visit (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you think? Any memorable moments?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={4}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {notes.length}/500 characters
            </p>
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {isSavingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Business Details */}
        <BusinessDetailsCard poi={checkin.poi} />

        {/* Action Buttons
        <div className="space-y-3">
          <Link
            to="/nearby"
            className="w-full block text-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Find More Places
          </Link>

          <Link
            to="/checkins"
            className="w-full block text-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Check-in History
          </Link>
        </div> */}

        {/* OSM Contribution Section */}
        <OSMContribution
          osmType={checkin.poi.osm_type}
          osmId={checkin.poi.osm_id}
          tags={checkin.poi.tags}
          isExpanded={osmContributionExpanded}
          onToggleExpanded={setOsmContributionExpanded}
          className="mt-8"
        />
      </div>
    </div>
  )
}
