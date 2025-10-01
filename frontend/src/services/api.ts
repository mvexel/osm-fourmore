import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import {
  POI,
  CheckIn,
  AuthToken,
  NearbyRequest,
  CheckInCreate,
  ApiResponse,
  ClassesListEntry,
  CheckinHistory,
  CheckinStats,
  QuestApplicableResponse,
  QuestRespondRequest,
  QuestRespondResponse,
} from '../types'

type LoginUrlResponse = { auth_url: string }
type NearbyResponse = POI[]
type PlaceDetailsResponse = POI
type CheckinDeleteResponse = ApiResponse
type ConfirmInfoResponse = {
  success: boolean
  osm_id: string
  osm_type: string
  changeset_id: string
  new_version: number
  check_date: string
  message: string
}
type CreateNoteResponse = {
  success: boolean
  note_id: number
  message: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fourmore_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fourmore_token')
      localStorage.removeItem('fourmore_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

const unwrap = <T>(response: AxiosResponse<T>): T => response.data

export const authApi = {
  async getLoginUrl(): Promise<LoginUrlResponse> {
    const response = await api.get<ApiResponse<LoginUrlResponse>>('/auth/login')
    const data = unwrap(response).data
    if (!data?.auth_url) {
      throw new Error('Missing login URL in response')
    }
    return data
  },

  async handleCallback(code: string): Promise<AuthToken> {
    const response = await api.get<AuthToken>(`/auth/callback?code=${code}`)
    return unwrap(response)
  },
}

export const placesApi = {
  async getNearby(request: NearbyRequest): Promise<NearbyResponse> {
    const response = await api.post<NearbyResponse>('/places/nearby', request)
    return unwrap(response)
  },

  async getDetails(osmType: string, osmId: number): Promise<PlaceDetailsResponse> {
    const response = await api.get<PlaceDetailsResponse>(`/places/${osmType}/${osmId}`)
    return unwrap(response)
  },

  async getClasses(): Promise<ClassesListEntry[]> {
    const response = await api.get<ApiResponse<ClassesListEntry[]>>('/places/classes/list')
    return unwrap(response).data ?? []
  },
}

export const checkinsApi = {
  async create(checkin: CheckInCreate): Promise<CheckIn> {
    const response = await api.post<CheckIn>('/checkins', checkin)
    return unwrap(response)
  },

  async getHistory(page = 1, perPage = 20): Promise<CheckinHistory> {
    const response = await api.get<CheckinHistory>(`/checkins?page=${page}&per_page=${perPage}`)
    return unwrap(response)
  },

  async getDetails(checkinId: number): Promise<CheckIn> {
    const response = await api.get<CheckIn>(`/checkins/${checkinId}`)
    return unwrap(response)
  },

  async update(checkinId: number, comment: string | null): Promise<CheckIn> {
    const response = await api.patch<CheckIn>(`/checkins/${checkinId}`, { comment })
    return unwrap(response)
  },

  async delete(checkinId: number): Promise<CheckinDeleteResponse> {
    const response = await api.delete<CheckinDeleteResponse>(`/checkins/${checkinId}`)
    return unwrap(response)
  },

  async getStats(): Promise<CheckinStats> {
    const response = await api.get<ApiResponse<CheckinStats>>('/checkins/stats/summary')
    return unwrap(response).data ?? {
      total_checkins: 0,
      unique_places: 0,
      favorite_class: null,
      member_since: null,
    }
  },

  async exportGeojson(): Promise<void> {
    const response = await api.get('/checkins/export/geojson', {
      responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fourmore_checkins.geojson`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}

export const osmApi = {
  async confirmInfo(osmType: string, osmId: number): Promise<ConfirmInfoResponse> {
    const response = await api.post<ConfirmInfoResponse>('/osm/confirm-info', { poi_osm_type: osmType, poi_osm_id: osmId })
    return unwrap(response)
  },

  async createNote(osmType: string, osmId: number, text: string): Promise<CreateNoteResponse> {
    const response = await api.post<CreateNoteResponse>('/osm/note', { poi_osm_type: osmType, poi_osm_id: osmId, text })
    return unwrap(response)
  },
}

export const questsApi = {
  async getApplicable(osmType: string, osmId: number): Promise<QuestApplicableResponse> {
    const response = await api.get<QuestApplicableResponse>(`/quests/applicable/${osmType}/${osmId}`)
    return unwrap(response)
  },

  async respond(request: QuestRespondRequest): Promise<QuestRespondResponse> {
    const response = await api.post<QuestRespondResponse>('/quests/respond', request)
    return unwrap(response)
  },
}

export const usersApi = {
  async deleteAccount(): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>('/users/delete')
    return unwrap(response)
  },
}
