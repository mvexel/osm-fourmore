import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NavIcons } from '../utils/icons'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-primary-600">
              FourMore
            </Link>
            {user && (
              <div className="flex items-center space-x-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name || user.username}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                    {NavIcons.profile({ size: 20 })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto min-h-screen bg-white">
        {children}
      </main>

      {/* Bottom Navigation */}
      {user && (
        <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200">
          <div className="flex justify-around py-2">
            <Link
              to="/nearby"
              className={`flex flex-col items-center py-2 px-4 text-xs ${isActive('/nearby')
                ? 'text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="mb-1">{NavIcons.nearby({ size: 24 })}</div>
              Nearby
            </Link>

            <Link
              to="/checkins"
              className={`flex flex-col items-center py-2 px-4 text-xs ${isActive('/checkins')
                ? 'text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="mb-1">{NavIcons.history({ size: 24 })}</div>
              History
            </Link>

            <Link
              to="/profile"
              className={`flex flex-col items-center py-2 px-4 text-xs ${isActive('/profile')
                ? 'text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="mb-1">{NavIcons.profile({ size: 24 })}</div>
              Profile
            </Link>
          </div>
        </nav>
      )}
    </div>
  )
}
