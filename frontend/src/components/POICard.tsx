import { Fragment } from 'react'
import { POI } from '../types'
import { getCategoryIcon, getCategoryLabel, ContactIcons } from '../utils/icons'

interface POICardProps {
  poi: POI
  onClick: () => void
  onDetailsClick: () => void
  highlight?: string
  isActive?: boolean
  isExpanded?: boolean
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightText = (text: string, highlight?: string) => {
  if (!highlight) {
    return text
  }

  const safeHighlight = escapeRegExp(highlight)
  const regex = new RegExp(`(${safeHighlight})`, 'ig')
  const segments = text.split(regex)

  return segments.map((segment, index) => {
    if (segment.toLowerCase() === highlight.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">
          {segment}
        </mark>
      )
    }
    return <Fragment key={index}>{segment}</Fragment>
  })
}

export function POICard({ poi, onClick, onDetailsClick, highlight, isActive = false, isExpanded = false }: POICardProps) {
  const formatDistance = (distanceInMeters: number) => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`
    }
    return `${(distanceInMeters / 1000).toFixed(1)}km`
  }

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDetailsClick()
  }

  return (
    <div
      className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer transition-colors border ${isActive
        ? 'border-primary-500 ring-1 ring-primary-200'
        : 'border-gray-200 hover:bg-gray-50'
        }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        <div className="text-primary-600">
          {getCategoryIcon(poi.class || poi.category || 'misc', { size: 20 })}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-1">
            {poi.name ? highlightText(poi.name, highlight) : 'Unnamed Location'}
          </h3>
          <p className="text-xs text-gray-600">
            <span>{getCategoryLabel(poi.class || poi.category)}</span>
            {poi.distance !== undefined && (
              <span> • {formatDistance(poi.distance)} away</span>
            )}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
          {poi.address && (
            <div className="flex items-start space-x-2">
              <span className="text-gray-400 mt-0.5">
                {ContactIcons.location({ size: 16 })}
              </span>
              <p className="text-xs text-gray-700 flex-1">{poi.address}</p>
            </div>
          )}

          {poi.phone && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">
                {ContactIcons.phone({ size: 16 })}
              </span>
              <a
                href={`tel:${poi.phone}`}
                className="text-xs text-primary-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {poi.phone}
              </a>
            </div>
          )}

          {poi.website && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">
                {ContactIcons.website({ size: 16 })}
              </span>
              <a
                href={poi.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                Visit Website
              </a>
            </div>
          )}

          {poi.opening_hours && (
            <div className="flex items-start space-x-2">
              <span className="text-gray-400 mt-0.5">
                {ContactIcons.hours({ size: 16 })}
              </span>
              <p className="text-xs text-gray-700 flex-1">{poi.opening_hours}</p>
            </div>
          )}

          <button
            onClick={handleDetailsClick}
            className="w-full mt-2 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
          >
            Details
          </button>
        </div>
      )}
    </div>
  )
}
