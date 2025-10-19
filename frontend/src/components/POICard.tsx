import { Fragment, type ReactNode } from 'react'
import { POI } from '../types'
import { getCategoryIcon, getCategoryLabel } from '../utils/icons'

interface POICardProps {
  poi: POI
  onClick: () => void
  highlight?: string
  isActive?: boolean
  isExpanded?: boolean
  children?: ReactNode
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

export function POICard({ poi, onClick, highlight, isActive = false, isExpanded = false, children }: POICardProps) {
  const formatDistance = (distanceInMeters: number) => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`
    }
    return `${(distanceInMeters / 1000).toFixed(1)}km`
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
        <div className="text-gray-600">
          {getCategoryIcon(poi.class || poi.category || 'misc', { size: 20 })}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-1">
            {poi.name ? highlightText(poi.name, highlight) : 'Unnamed Location'}
          </h3>
          <p className="text-xs text-gray-600">
            <span>{getCategoryLabel(poi.class || poi.category)}</span>
            {poi.distance !== undefined && (
              <span>, {formatDistance(poi.distance)} away</span>
            )}
          </p>
        </div>
      </div>
      {isExpanded && children && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {children}
        </div>
      )}
    </div>
  )
}
