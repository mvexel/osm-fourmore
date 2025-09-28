import { POI } from '../types'
import { getCategoryIcon, getCategoryLabel, ContactIcons } from '../utils/icons'

interface BusinessDetailsCardProps {
  poi: POI
}

export function BusinessDetailsCard({ poi }: BusinessDetailsCardProps) {

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
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

      {/* Address */}
      {poi.address && (
        <div className="mb-4">
          <div className="flex items-start space-x-2">
            <div className="text-gray-400 mt-0.5">{ContactIcons.location({ size: 16 })}</div>
            <p className="text-gray-700">{poi.address}</p>
          </div>
        </div>
      )}

      {/* Contact & Hours Info */}
      <div className="space-y-3">
        {poi.phone && (
          <div className="flex items-center space-x-3">
            <div className="text-gray-400">{ContactIcons.phone({ size: 16 })}</div>
            <a
              href={`tel:${poi.phone}`}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              {poi.phone}
            </a>
          </div>
        )}

        {poi.website && (
          <div className="flex items-center space-x-3">
            <div className="text-gray-400">{ContactIcons.website({ size: 16 })}</div>
            <a
              href={poi.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 transition-colors"
            >
              Visit Website
            </a>
          </div>
        )}

        {poi.opening_hours && (
          <div className="flex items-start space-x-3">
            <div className="text-gray-400 mt-0.5">{ContactIcons.hours({ size: 16 })}</div>
            <p className="text-gray-700">{poi.opening_hours}</p>
          </div>
        )}
      </div>

      {/* Map Link */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <a
          href={`https://www.openstreetmap.org/?mlat=${poi.lat}&mlon=${poi.lon}&zoom=18`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-primary-600 transition-colors"
        >
          <div className="text-gray-600">{ContactIcons.map({ size: 16 })}</div>
          <span>View on OpenStreetMap</span>
        </a>
      </div>

      {/* Additional Tags */}
      {poi.tags && Object.keys(poi.tags).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Information</h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(poi.tags).slice(0, 5).map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
