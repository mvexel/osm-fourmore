import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { IconLogout } from '@tabler/icons-react'
import { useAuth } from '../hooks/useAuth'
import { NavIcons } from '../utils/icons'

const AVATAR_BUTTON_CLASSES = 'flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full'
const AVATAR_SIZE_SM = 'w-8 h-8'
const AVATAR_SIZE_MD = 'w-10 h-10'
const AVATAR_CLASSES = 'rounded-full object-cover border border-gray-200'
const AVATAR_PLACEHOLDER_CLASSES = 'rounded-full bg-primary-100 flex items-center justify-center text-primary-600'
const MENU_ITEM_CLASSES = 'flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors'

export function UserDropdown() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = () => {
    setIsOpen(false)
    logout()
  }

  const closeMenu = () => setIsOpen(false)

  if (!user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={AVATAR_BUTTON_CLASSES}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name || user.username}
            className={`${AVATAR_SIZE_SM} ${AVATAR_CLASSES} hover:border-primary-400 transition-colors`}
          />
        ) : (
          <div className={`${AVATAR_SIZE_SM} ${AVATAR_PLACEHOLDER_CLASSES} hover:bg-primary-200 transition-colors`}>
            {NavIcons.profile({ size: 20 })}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || user.username}
                  className={`${AVATAR_SIZE_MD} ${AVATAR_CLASSES}`}
                />
              ) : (
                <div className={`${AVATAR_SIZE_MD} ${AVATAR_PLACEHOLDER_CLASSES}`}>
                  {NavIcons.profile({ size: 24 })}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.display_name || user.username}
                </p>
                {user.display_name && (
                  <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="py-1">
            <Link to="/checkins" onClick={closeMenu} className={MENU_ITEM_CLASSES}>
              <div className="text-gray-500">
                {NavIcons.history({ size: 20 })}
              </div>
              <span>History</span>
            </Link>

            <Link to="/profile" onClick={closeMenu} className={MENU_ITEM_CLASSES}>
              <div className="text-gray-500">
                {NavIcons.profile({ size: 20 })}
              </div>
              <span>Profile</span>
            </Link>
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-1">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <IconLogout size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
