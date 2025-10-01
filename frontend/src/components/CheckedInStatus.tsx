import { POI } from '../types'
import { getCategoryIcon, UIIcons } from '../utils/icons'
import { formatDistanceToNow } from 'date-fns'

interface CheckedInStatusProps {
  poi: POI
  checkedInAt: string
  onClick: () => void
}

export function CheckedInStatus({ poi, checkedInAt, onClick }: CheckedInStatusProps) {
  const timeAgo = formatDistanceToNow(new Date(checkedInAt), { addSuffix: true })

  return (
    <div
      onClick={onClick}
      className="bg-green-50 border-l-4 border-green-500 p-3 cursor-pointer hover:bg-green-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="text-green-700">
          {UIIcons.checked_in({ size: 24 })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-green-700 flex-shrink-0">
              {getCategoryIcon(poi.class || poi.category || 'misc', { size: 16 })}
            </div>
            <h3 className="font-medium text-green-900 truncate">
              {poi.name || 'Unnamed Location'}
            </h3>
          </div>
          <p className="text-xs text-green-700 mt-0.5">
            Checked in {timeAgo}
          </p>
        </div>
        <div className="text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
