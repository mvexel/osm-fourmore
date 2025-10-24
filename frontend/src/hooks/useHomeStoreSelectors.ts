import { useMemo } from 'react'
import type { CategoryKey } from '../generated/category_metadata'
import type { POI } from '../types'
import { useHomeStore } from '../stores/homeStore'

interface MapSlice {
  center: { lat: number; lon: number }
  bounds: { north: number; south: number; east: number; west: number } | null
  zoom: number
  includeUserLocation: boolean
}

interface ResultsSlice {
  pois: POI[]
  selectedPoiId: string | null
  expandedPoiId: string | null
}

interface SearchSlice {
  query: string
  display: string
  lastCategory: CategoryKey | null
  lastCenter: { lat: number; lon: number } | null
}

interface ActionsSlice {
  setMapCenter: (center: MapSlice['center']) => void
  setMapBounds: (bounds: MapSlice['bounds']) => void
  setCurrentZoom: (zoom: number) => void
  setIncludeUserLocationInViewport: (include: boolean) => void
  setPois: (pois: POI[]) => void
  setSelectedPoiId: (id: string | null) => void
  setExpandedPoiId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  setSearchDisplay: (display: string) => void
  setLastSearchCategory: (category: CategoryKey | null) => void
  setLastSearchCenter: (center: { lat: number; lon: number } | null) => void
  snapshotMapState: () => void
  restoreMapSnapshot: () => boolean
  clearResults: () => void
}

interface HomeStoreSelectors {
  map: MapSlice
  results: ResultsSlice
  search: SearchSlice
  actions: ActionsSlice
}

export function useHomeStoreSelectors(): HomeStoreSelectors {
  const mapCenter = useHomeStore((state) => state.mapCenter)
  const mapBounds = useHomeStore((state) => state.mapBounds)
  const currentZoom = useHomeStore((state) => state.currentZoom)
  const includeUserLocation = useHomeStore((state) => state.includeUserLocationInViewport)

  const pois = useHomeStore((state) => state.pois)
  const selectedPoiId = useHomeStore((state) => state.selectedPoiId)
  const expandedPoiId = useHomeStore((state) => state.expandedPoiId)

  const searchQuery = useHomeStore((state) => state.searchQuery)
  const searchDisplay = useHomeStore((state) => state.searchDisplay)
  const lastSearchCategory = useHomeStore((state) => state.lastSearchCategory)
  const lastSearchCenter = useHomeStore((state) => state.lastSearchCenter)

  const setMapCenter = useHomeStore((state) => state.setMapCenter)
  const setMapBounds = useHomeStore((state) => state.setMapBounds)
  const setCurrentZoom = useHomeStore((state) => state.setCurrentZoom)
  const setIncludeUserLocationInViewport = useHomeStore((state) => state.setIncludeUserLocationInViewport)
  const setPois = useHomeStore((state) => state.setPois)
  const setSelectedPoiId = useHomeStore((state) => state.setSelectedPoiId)
  const setExpandedPoiId = useHomeStore((state) => state.setExpandedPoiId)
  const setSearchQuery = useHomeStore((state) => state.setSearchQuery)
  const setSearchDisplay = useHomeStore((state) => state.setSearchDisplay)
  const setLastSearchCategory = useHomeStore((state) => state.setLastSearchCategory)
  const setLastSearchCenter = useHomeStore((state) => state.setLastSearchCenter)
  const snapshotMapState = useHomeStore((state) => state.snapshotMapState)
  const restoreMapSnapshot = useHomeStore((state) => state.restoreMapSnapshot)
  const clearResults = useHomeStore((state) => state.clearResults)

  return useMemo(
    () => ({
      map: {
        center: mapCenter,
        bounds: mapBounds,
        zoom: currentZoom,
        includeUserLocation,
      },
      results: {
        pois,
        selectedPoiId,
        expandedPoiId,
      },
      search: {
        query: searchQuery,
        display: searchDisplay,
        lastCategory: lastSearchCategory,
        lastCenter: lastSearchCenter,
      },
      actions: {
        setMapCenter,
        setMapBounds,
        setCurrentZoom,
        setIncludeUserLocationInViewport,
        setPois,
        setSelectedPoiId,
        setExpandedPoiId,
        setSearchQuery,
        setSearchDisplay,
        setLastSearchCategory,
        setLastSearchCenter,
        snapshotMapState,
        restoreMapSnapshot,
        clearResults,
      },
    }),
    [
      mapCenter,
      mapBounds,
      currentZoom,
      includeUserLocation,
      pois,
      selectedPoiId,
      expandedPoiId,
      searchQuery,
      searchDisplay,
      lastSearchCategory,
      lastSearchCenter,
      setMapCenter,
      setMapBounds,
      setCurrentZoom,
      setIncludeUserLocationInViewport,
      setPois,
      setSelectedPoiId,
      setExpandedPoiId,
      setSearchQuery,
      setSearchDisplay,
      setLastSearchCategory,
      setLastSearchCenter,
      snapshotMapState,
      restoreMapSnapshot,
      clearResults,
    ]
  )
}
