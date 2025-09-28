import { POI } from '../types'
import { getCategoryIcon, getCategoryLabel } from '../utils/icons'

interface POICardProps {
  poi: POI
  onClick: () => void
  showCheckInButton?: boolean
  onCheckIn?: () => void
  isCheckingIn?: boolean
}

export function POICard({ poi, onClick, showCheckInButton, onCheckIn, isCheckingIn = false }: POICardProps) {
  const formatDistance = (distanceInMeters: number) => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`
    }
    return `${(distanceInMeters / 1000).toFixed(1)}km`
  }



  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-stretch justify-between">
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <div className="flex items-center space-x-2 mb-2">
            <div className="text-gray-600">{getCategoryIcon(poi.class || poi.category || 'misc', { size: 20 })}</div>
            <div>
              <h3 className="font-medium text-gray-900 line-clamp-1">
                {poi.name || 'Unnamed Location'}
              </h3>
              <p className="text-xs text-gray-600">
                <span>{getCategoryLabel(poi.class || poi.category)}</span>
                {poi.distance !== undefined && (
                  <span>, {formatDistance(poi.distance)} away</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {showCheckInButton && onCheckIn && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCheckIn()
            }}
            disabled={isCheckingIn}
            className="ml-3 px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-stretch"
          >
            {isCheckingIn ? 'Checking In...' : 'Check In'}
          </button>
        )}
      </div>

    </div>
  )
}
