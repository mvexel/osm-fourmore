import { useState } from 'react'
import { osmApi } from '../services/api'
import { IconCheck } from '@tabler/icons-react'

interface OSMContributionProps {
  poiId: number
  className?: string
}

export function OSMContribution({ poiId, className }: OSMContributionProps) {
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null)

  const handleConfirmInfo = async () => {
    setConfirming(true)
    try {
      const result = await osmApi.confirmInfo(poiId)
      setConfirmed(true)
      setConfirmMessage(result.message)
    } catch (err) {
      console.error('Error confirming info:', err)
      alert('Failed to confirm info. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className={`p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <div className="flex items-center space-x-2 mb-3 justify-center">
        <h3 className="font-medium text-green-900">You can help keep OSM up to date!</h3>
      </div>

      {confirmed ? (
        <div className="flex items-center gap-2 p-3 bg-green-100 rounded-md">
          <IconCheck size={20} className="text-green-600" />
          <span className="text-sm text-green-800">{confirmMessage}</span>
        </div>
      ) : (
        <button
          onClick={handleConfirmInfo}
          disabled={confirming}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconCheck size={20} />
          {confirming ? 'Confirming...' : 'Confirm Info is Correct'}
        </button>

      )}
      <p className="text-xs text-gray-500 text-center pt-4">By confirming, FourMore will add a <code>check_date</code> to the feature in OSM. This indicates to other mappers that the information has been reviewed, even if no changes were made.</p>
    </div>
  )
}
