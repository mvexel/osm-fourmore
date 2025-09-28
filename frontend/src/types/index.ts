export interface POI {
  osm_id: number
  osm_type: string
  name: string
  class: string
  lat: number
  lon: number
  address?: string
  phone?: string
  website?: string
  opening_hours?: string
  tags: Record<string, any>
  version: number
  timestamp: string
  distance?: number
}

export interface User {
  id: number
  osm_user_id: string
  username: string
  display_name?: string
  email?: string
  avatar_url?: string
  created_at: string
  is_active: boolean
}

export interface CheckIn {
  id: number
  poi_osm_type: string
  poi_osm_id: number
  user_id: number
  comment?: string
  created_at: string
  poi: POI
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}

export interface NearbyRequest {
  lat: number
  lon: number
  radius?: number
  class?: string
  limit?: number
  offset?: number
}

export interface CheckInCreate {
  poi_osm_type: string
  poi_osm_id: number
  comment?: string
  user_lat?: number
  user_lon?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}
