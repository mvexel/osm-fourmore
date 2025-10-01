export type POITags = Record<string, string | number | boolean>

export interface POI {
  id?: number
  osm_id: number
  osm_type: string
  name: string
  class: string
  category?: string
  subcategory?: string
  lat: number
  lon: number
  address?: string
  phone?: string
  website?: string
  opening_hours?: string
  tags: POITags
  version: number
  timestamp: string
  distance?: number
  is_checked_in?: boolean
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

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}

export interface ClassesListEntry {
  class: string
  count: number
}

export interface CheckinHistory {
  checkins: CheckIn[]
  total: number
  page: number
  per_page: number
}

export interface CheckinStats {
  total_checkins: number
  unique_places: number
  favorite_class: string | null
  member_since: string | null
}

export interface Quest {
  id: string
  question: string
}

export interface QuestApplicableResponse {
  quests: Quest[]
  total: number
}

export interface QuestRespondRequest {
  poi_osm_type: string
  poi_osm_id: number
  quest_id: string
  answer: string
}

export interface QuestRespondResponse {
  success: boolean
  changeset_id: string | null
  message: string
}
