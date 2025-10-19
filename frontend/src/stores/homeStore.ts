import { create } from 'zustand'
import type { POI } from '../types'
import type { CategoryKey } from '../generated/category_metadata'

interface HomeState {
    // Map state
    mapCenter: { lat: number; lon: number }
    currentZoom: number
    mapBounds: { north: number; south: number; east: number; west: number } | null
    includeUserLocationInViewport: boolean

    // Snapshot of map state before navigating to details (for restoration)
    preNavigationMapCenter: { lat: number; lon: number } | null
    preNavigationMapBounds: { north: number; south: number; east: number; west: number } | null

    // POI state
    pois: POI[]
    selectedPoiId: string | null
    expandedPoiId: string | null

    // Search state
    searchQuery: string
    searchDisplay: string
    lastSearchCategory: CategoryKey | null
    lastSearchCenter: { lat: number; lon: number } | null

    // Actions
    setMapCenter: (center: { lat: number; lon: number }) => void
    setCurrentZoom: (zoom: number) => void
    setMapBounds: (bounds: { north: number; south: number; east: number; west: number } | null) => void
    setIncludeUserLocationInViewport: (include: boolean) => void
    snapshotMapState: () => void  // Save current map state before navigation
    restoreMapSnapshot: () => boolean  // Restore map state from snapshot, returns true if restored
    setPois: (pois: POI[]) => void
    setSelectedPoiId: (id: string | null) => void
    setExpandedPoiId: (id: string | null) => void
    setSearchQuery: (query: string) => void
    setSearchDisplay: (display: string) => void
    setLastSearchCategory: (category: CategoryKey | null) => void
    setLastSearchCenter: (center: { lat: number; lon: number } | null) => void

    // Reset (useful for logout or clearing)
    reset: () => void
    clearResults: () => void
}

const DEFAULT_CENTER = { lat: 40.7128, lon: -74.006 } // New York City fallback
export const DEFAULT_SEARCH_DISPLAY = 'Search nearby'
const INITIAL_ZOOM = 17

const initialState = {
    mapCenter: DEFAULT_CENTER,
    currentZoom: INITIAL_ZOOM,
    mapBounds: null,
    includeUserLocationInViewport: true,
    preNavigationMapCenter: null,
    preNavigationMapBounds: null,
    pois: [],
    selectedPoiId: null,
    expandedPoiId: null,
    searchQuery: '',
    searchDisplay: DEFAULT_SEARCH_DISPLAY,
    lastSearchCategory: null,
    lastSearchCenter: null,
}

export const useHomeStore = create<HomeState>((set, get) => ({
    ...initialState,

    setMapCenter: (center) => set({ mapCenter: center }),
    setCurrentZoom: (zoom) => set({ currentZoom: zoom }),
    setMapBounds: (bounds) => set({ mapBounds: bounds }),
    setIncludeUserLocationInViewport: (include) => set({ includeUserLocationInViewport: include }),

    // Snapshot current map state before navigating to details
    snapshotMapState: () => {
        const state = get()
        set({
            preNavigationMapCenter: state.mapCenter,
            preNavigationMapBounds: state.mapBounds,
        })
    },

    // Restore map to pre-navigation state - returns true if restored
    restoreMapSnapshot: () => {
        const state = get()
        if (state.preNavigationMapCenter) {
            set({
                mapCenter: state.preNavigationMapCenter,
                mapBounds: state.preNavigationMapBounds,
                preNavigationMapCenter: null,
                preNavigationMapBounds: null,
            })
            return true
        }
        return false
    },

    setPois: (pois) => set({ pois }),
    setSelectedPoiId: (id) => set({ selectedPoiId: id }),
    setExpandedPoiId: (id) => set({ expandedPoiId: id }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSearchDisplay: (display) => set({ searchDisplay: display }),
    setLastSearchCategory: (category) => set({ lastSearchCategory: category }),
    setLastSearchCenter: (center) => set({ lastSearchCenter: center }),

    reset: () => set(initialState),
    clearResults: () =>
        set({
            pois: [],
            selectedPoiId: null,
            expandedPoiId: null,
            searchDisplay: DEFAULT_SEARCH_DISPLAY,
            searchQuery: '',
            lastSearchCategory: null,
            lastSearchCenter: null,
            mapBounds: null,
            includeUserLocationInViewport: true,
        }),
}))
