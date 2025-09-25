import axios from 'axios'
import { POI, CheckIn, AuthToken, NearbyRequest, CheckInCreate, ApiResponse, User } from '../types'

// Storage interface to abstract localStorage vs AsyncStorage
export interface Storage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

// Default web storage implementation
const defaultStorage: Storage = {
  async getItem(key: string): Promise<string | null> {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    }
  },
  async removeItem(key: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
    }
  },
}

let storage: Storage = defaultStorage
const API_BASE = '/api'

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

// Initialize storage
export function initializeStorage(storageImpl: Storage) {
  storage = storageImpl
}

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('fourmore_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.removeItem('fourmore_token')
      await storage.removeItem('fourmore_user')
      // For web, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      // For mobile, the app should handle this by listening to storage changes
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  getLoginUrl: async (): Promise<{ auth_url: string }> => {
    const response = await api.get('/auth/login')
    return response.data.data
  },

  handleCallback: async (code: string): Promise<AuthToken> => {
    const response = await api.post('/auth/callback', { code })
    return response.data
  },
}

// Places API
export const placesApi = {
  getNearby: async (request: NearbyRequest): Promise<POI[]> => {
    const response = await api.post('/places/nearby', request)
    return response.data
  },

  getDetails: async (poiId: number): Promise<POI> => {
    const response = await api.get(`/places/${poiId}`)
    return response.data
  },

  getCategories: async (): Promise<ApiResponse<Array<{ category: string; count: number }>>> => {
    const response = await api.get('/places/categories/list')
    return response.data
  },
}

// Check-ins API
export const checkinsApi = {
  create: async (checkin: CheckInCreate): Promise<CheckIn> => {
    const response = await api.post('/checkins', checkin)
    return response.data
  },

  getHistory: async (page = 1, perPage = 20): Promise<{
    checkins: CheckIn[]
    total: number
    page: number
    per_page: number
  }> => {
    const response = await api.get(`/checkins?page=${page}&per_page=${perPage}`)
    return response.data
  },

  getDetails: async (checkinId: number): Promise<CheckIn> => {
    const response = await api.get(`/checkins/${checkinId}`)
    return response.data
  },

  delete: async (checkinId: number): Promise<ApiResponse> => {
    const response = await api.delete(`/checkins/${checkinId}`)
    return response.data
  },

  getStats: async (): Promise<ApiResponse<{
    total_checkins: number
    unique_places: number
    favorite_category: string
    member_since: string
  }>> => {
    const response = await api.get('/checkins/stats/summary')
    return response.data
  },
}

// OSM Edits API
export const osmApi = {
  confirmInfo: async (poiId: number): Promise<{
    success: boolean
    osm_id: string
    osm_type: string
    changeset_id: string
    new_version: number
    check_date: string
    message: string
  }> => {
    const response = await api.post('/osm/confirm-info', { poi_id: poiId })
    return response.data
  },
}