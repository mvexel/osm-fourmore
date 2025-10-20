import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconMap, IconList } from '@tabler/icons-react'
import { Home } from './Home'
import { Nearby } from './Nearby'
import { cn } from '../utils/classNames'

type ViewMode = 'map' | 'list'

const SWITCHER_BUTTON_BASE = 'flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 min-[400px]:px-3 rounded-md text-xs font-medium transition-all'
const SWITCHER_BUTTON_ACTIVE = 'bg-primary-600 text-white'
const SWITCHER_BUTTON_INACTIVE = 'text-gray-600 hover:text-gray-900'

export function Discover() {
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [headerCenter, setHeaderCenter] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHeaderCenter(document.getElementById('header-center'))
  }, [])

  const toggle = (
    <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => setViewMode('map')}
        className={cn(
          SWITCHER_BUTTON_BASE,
          viewMode === 'map' ? SWITCHER_BUTTON_ACTIVE : SWITCHER_BUTTON_INACTIVE
        )}
        aria-label="Discover"
        title="Discover"
      >
        <IconMap size={16} />
        <span className="hidden min-[400px]:inline">Discover</span>
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={cn(
          SWITCHER_BUTTON_BASE,
          viewMode === 'list' ? SWITCHER_BUTTON_ACTIVE : SWITCHER_BUTTON_INACTIVE
        )}
        aria-label="Log"
        title="Log"
      >
        <IconList size={16} />
        <span className="hidden min-[400px]:inline">Log</span>
      </button>
    </div>
  )

  return (
    <>
      {headerCenter && createPortal(toggle, headerCenter)}
      <div className="flex flex-col relative" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Content - Conditionally render to properly unmount maps */}
        <div className="flex-1 relative overflow-hidden">
          {viewMode === 'map' && <Home />}
          {viewMode === 'list' && <Nearby />}
        </div>
      </div>
    </>
  )
}
