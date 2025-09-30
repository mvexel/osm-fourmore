import { POI } from '../types'
import { getCategoryIcon, getCategoryLabel } from '../utils/icons'

interface POICardProps {
  poi: POI
  onClick: () => void
}

export function POICard({ poi, onClick }: POICardProps) {
  const formatDistance = (distanceInMeters: number) => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`
    }
    return `${(distanceInMeters / 1000).toFixed(1)}km`
  }



  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        <div className="text-gray-600">
          {getCategoryIcon(poi.class || poi.category || 'misc', { size: 20 })}
        </div>
        <div className="flex-1 min-w-0">
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
  )
}
