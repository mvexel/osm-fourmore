import { POI } from '../types'
import { getCategoryIcon, getCategoryLabel, ContactIcons } from '../utils/icons'

interface BusinessDetailsCardProps {
  poi: POI
  variant?: 'card' | 'embedded'
}

export function BusinessDetailsCard({ poi, variant = 'card' }: BusinessDetailsCardProps) {
  const isEmbedded = variant === 'embedded'
  const wrapperClasses = isEmbedded
    ? 'space-y-3 text-sm text-gray-700'
    : 'bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4'
  const detailSpacing = isEmbedded ? 'space-y-2' : 'space-y-3'
  const detailIconSize = isEmbedded ? 14 : 16
  const bodyTextClasses = isEmbedded ? 'text-sm text-gray-700' : 'text-gray-700'
  const linkTextClasses = isEmbedded ? 'text-sm' : ''

  const showContactSection = Boolean(poi.phone || poi.website || poi.opening_hours)

  return (
    <div className={wrapperClasses}>
      {!isEmbedded && (
        <div className="flex items-center space-x-3">
          <div className="text-gray-600">{getCategoryIcon(poi.class || poi.category || 'misc', { size: 28 })}</div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {poi.name || 'Unnamed Location'}
            </h2>
            <p className="text-sm text-gray-600">
              {getCategoryLabel(poi.class || poi.category)}
              {poi.subcategory && ` • ${getCategoryLabel(poi.subcategory)}`}
            </p>
          </div>
        </div>
      )}

      {poi.address && (
        <div className="flex items-start space-x-2">
          <div className="text-gray-400 mt-0.5">{ContactIcons.location({ size: detailIconSize })}</div>
          <p className={bodyTextClasses}>{poi.address}</p>
        </div>
      )}

      {showContactSection && (
        <div className={detailSpacing}>
          {poi.phone && (
            <div className="flex items-center space-x-3">
              <div className="text-gray-400">{ContactIcons.phone({ size: detailIconSize })}</div>
              <a
                href={`tel:${poi.phone}`}
                className={`${linkTextClasses} text-gray-700 hover:text-primary-600 transition-colors`}
              >
                {poi.phone}
              </a>
            </div>
          )}

          {poi.website && (
            <div className="flex items-center space-x-3">
              <div className="text-gray-400">{ContactIcons.website({ size: detailIconSize })}</div>
              <a
                href={poi.website}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkTextClasses} text-primary-600 hover:text-primary-700 transition-colors`}
              >
                Visit Website
              </a>
            </div>
          )}

          {poi.opening_hours && (
            <div className="flex items-start space-x-3">
              <div className="text-gray-400 mt-0.5">{ContactIcons.hours({ size: detailIconSize })}</div>
              <p className={bodyTextClasses}>{poi.opening_hours}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
