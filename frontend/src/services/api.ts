import axios from 'axios'
import { POI, CheckIn, AuthToken, NearbyRequest, CheckInCreate, ApiResponse } from '../types'

const API_BASE = '/api'

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fourmore_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fourmore_token')
      localStorage.removeItem('fourmore_user')
      window.location.href = '/login'
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