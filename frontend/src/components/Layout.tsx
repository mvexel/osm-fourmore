import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UserDropdown } from './UserDropdown'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
              FourMore
            </Link>
            <div id="header-center" className="flex-1 flex justify-center mx-4"></div>
            {user && <UserDropdown />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto min-h-screen bg-white">
        {children}
      </main>
    </div>
  )
}
