import { useState } from 'react'
import { IconMap, IconList } from '@tabler/icons-react'
import { Home } from './Home'
import { Nearby } from './Nearby'
import { cn, FLEX_BETWEEN } from '../utils/classNames'

type ViewMode = 'map' | 'list'

const SWITCHER_BUTTON_BASE = 'flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-all'
const SWITCHER_BUTTON_ACTIVE = 'bg-white text-primary-600 shadow-sm'
const SWITCHER_BUTTON_INACTIVE = 'text-gray-600 hover:text-gray-900'

export function Discover() {
  const [viewMode, setViewMode] = useState<ViewMode>('map')

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Segmented Control Switcher */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 z-20 flex-shrink-0">
        <div className={cn(FLEX_BETWEEN, 'mb-3')}>
          <h1 className="text-xl font-semibold text-gray-900">Discover</h1>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex bg-gray-100 rounded-lg p-1 w-full">
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              SWITCHER_BUTTON_BASE,
              viewMode === 'map' ? SWITCHER_BUTTON_ACTIVE : SWITCHER_BUTTON_INACTIVE
            )}
          >
            <IconMap size={18} />
            <span>Map Search</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              SWITCHER_BUTTON_BASE,
              viewMode === 'list' ? SWITCHER_BUTTON_ACTIVE : SWITCHER_BUTTON_INACTIVE
            )}
          >
            <IconList size={18} />
            <span>List Nearby</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? <Home /> : <Nearby />}
      </div>
    </div>
  )
}
