import React from 'react'
import { POI } from '../types'

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
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-stretch justify-between">
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getCategoryIcon(poi.category)}</span>
            <div>
              <h3 className="font-medium text-gray-900 line-clamp-1">
                {poi.name || 'Unnamed Location'}
              </h3>
              <p className="text-xs text-gray-600">
                <span className="capitalize">{poi.category.replace('_', ' ')}</span>
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

      {/* View on Map link
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
      </div> */}
    </div>
  )
}