import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { Nearby } from './pages/Nearby'
import { PlaceDetails } from './pages/PlaceDetails'
import { CheckIns } from './pages/CheckIns'
import { CheckinSuccess } from './pages/CheckinSuccess'
import { Profile } from './pages/Profile'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/nearby" replace /> : <Login />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/nearby" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/nearby"
        element={
          <ProtectedRoute>
            <Layout>
              <Nearby />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/places/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <PlaceDetails />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkins"
        element={
          <ProtectedRoute>
            <Layout>
              <CheckIns />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkin-success/:checkinId"
        element={
          <ProtectedRoute>
            <Layout>
              <CheckinSuccess />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
