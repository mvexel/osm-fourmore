import React from 'react'
import { POI } from '../types'

interface POICardProps {
  poi: POI
  onClick: () => void
  showCheckInButton?: boolean
  onCheckIn?: () => void
}

export function POICard({ poi, onClick, showCheckInButton, onCheckIn }: POICardProps) {
  const formatDistance = (distanceInMeters: number) => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`
    }
    return `${(distanceInMeters / 1000).toFixed(1)}km`
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food':
        return '🍽️'
      case 'retail':
        return '🛍️'
      case 'entertainment':
        return '🎬'
      case 'healthcare':
        return '🏥'
      case 'education':
        return '🎓'
      case 'finance':
        return '🏦'
      case 'automotive':
        return '⛽'
      case 'accommodation':
        return '🏨'
      case 'recreation':
        return '⚽'
      case 'government':
        return '🏛️'
      case 'religion':
        return '⛪'
      case 'services':
        return '🔧'
      case 'attractions':
        return '🗽'
      default:
        return '📍'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getCategoryIcon(poi.category)}</span>
            <h3 className="font-medium text-gray-900 line-clamp-1">
              {poi.name || 'Unnamed Location'}
            </h3>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <p className="capitalize">{poi.category.replace('_', ' ')}</p>
            {poi.address && (
              <p className="line-clamp-2">{poi.address}</p>
            )}
            {poi.distance !== undefined && (
              <p className="text-primary-600 font-medium">
                {formatDistance(poi.distance)} away
              </p>
            )}
          </div>

          {(poi.phone || poi.website || poi.opening_hours) && (
            <div className="mt-2 space-y-1">
              {poi.phone && (
                <p className="text-xs text-gray-500">📞 {poi.phone}</p>
              )}
              {poi.opening_hours && (
                <p className="text-xs text-gray-500">🕐 {poi.opening_hours}</p>
              )}
              {poi.website && (
                <a
                  href={poi.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  🌐 Visit Website
                </a>
              )}
            </div>
          )}
        </div>

        {showCheckInButton && onCheckIn && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCheckIn()
            }}
            className="ml-3 px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
          >
            Check In
          </button>
        )}
      </div>

      {/* View on Map link */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <a
          href={`https://www.openstreetmap.org/?mlat=${poi.lat}&mlon=${poi.lon}&zoom=18`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-primary-600 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          📍 View on OpenStreetMap
        </a>
      </div>
    </div>
  )
}