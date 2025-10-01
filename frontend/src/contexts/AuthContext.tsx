import { useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import { AuthContext, AuthContextType } from './AuthContextObject'

const readStoredUser = (): User | null => {
  const stored = localStorage.getItem('fourmore_user')
  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored) as User
  } catch (error) {
    console.error('Failed to parse stored user', error)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('fourmore_token')
    const savedUser = readStoredUser()

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(savedUser)
    }
  }, [])

  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('fourmore_token', newToken)
    localStorage.setItem('fourmore_user', JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('fourmore_token')
    localStorage.removeItem('fourmore_user')
  }

  const updateUser = (newUser: User) => {
    setUser(newUser)
    localStorage.setItem('fourmore_user', JSON.stringify(newUser))
  }

  const contextValue: AuthContextType = {
    user,
    token,
    login,
    logout,
    updateUser,
    isAuthenticated: Boolean(token && user),
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
