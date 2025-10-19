import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconMap, IconList } from '@tabler/icons-react'
import { Home } from './Home'
import { Nearby } from './Nearby'
import { cn } from '../utils/classNames'

type ViewMode = 'map' | 'list'

const SWITCHER_BUTTON_BASE = 'flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-all'
const SWITCHER_BUTTON_ACTIVE = 'bg-primary-600 text-white'
const SWITCHER_BUTTON_INACTIVE = 'text-gray-600 hover:text-gray-900'

export function Discover() {
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [headerCenter, setHeaderCenter] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHeaderCenter(document.getElementById('header-center'))
  }, [])

  const toggle = (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setViewMode('map')}
        className={cn(
          SWITCHER_BUTTON_BASE,
          viewMode === 'map' ? SWITCHER_BUTTON_ACTIVE : SWITCHER_BUTTON_INACTIVE
        )}
      >
        <IconMap size={16} />
        <span>Map</span>
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={cn(
          SWITCHER_BUTTON_BASE,
          viewMode === 'list' ? SWITCHER_BUTTON_ACTIVE : SWITCHER_BUTTON_INACTIVE
        )}
      >
        <IconList size={16} />
        <span>List</span>
      </button>
    </div>
  )

  return (
    <>
      {headerCenter && createPortal(toggle, headerCenter)}
      <div className="flex flex-col relative" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {viewMode === 'map' ? <Home /> : <Nearby />}
        </div>
      </div>
    </>
  )
}
