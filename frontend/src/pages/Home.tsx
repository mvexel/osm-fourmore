import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconSearch,
  IconX,
  IconLoader2,
  IconChevronRight,
  IconCategory,
  IconMapSearch,
  IconRadar,
  IconCurrentLocation,
} from '@tabler/icons-react'
import { SearchMap } from '../components/SearchMap'
import { placesApi } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'
import type { POI, SearchRequest } from '../types'
import { CATEGORY_META, type CategoryKey } from '../generated/category_metadata'
import { POICard } from '../components/POICard'
import { useNavigate } from 'react-router-dom'
import { calculateBboxFromZoom, calculateDistance, formatDistance } from '../utils/mapUtils'
import { DEFAULT_SEARCH_DISPLAY, useHomeStore } from '../stores/homeStore'

const INITIAL_ZOOM = 17 // Street-level detail
const MIN_ZOOM = 12 // City-level fallback
const MIN_RESULTS_THRESHOLD = 10
const MAP_MOVE_THRESHOLD = 0.002 // ~200m at mid-latitudes
const MIN_QUERY_LENGTH = 3
const POPULAR_CATEGORY_KEYS: CategoryKey[] = [
  'restaurant',
  'cafe_bakery',
  'ice-cream',
  'bar_pub',
  'grocery',
  'culture',
  'parks_outdoors',
].filter((key) => key in CATEGORY_META) as CategoryKey[]

type CategorySuggestion = { kind: 'category'; className: CategoryKey; label: string }
type PlaceSuggestion = { kind: 'place'; poi: POI }
type Suggestion = CategorySuggestion | PlaceSuggestion

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const highlightText = (text: string, highlight?: string) => {
  if (!highlight) {
    return text
  }
  const safeHighlight = escapeRegExp(highlight)
  const regex = new RegExp(`(${safeHighlight})`, 'ig')
  const segments = text.split(regex)
  return segments.map((segment, index) => {
    if (segment.toLowerCase() === highlight.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">
          {segment}
        </mark>
      )
    }
    return (
      <span key={index} className="text-inherit">
        {segment}
      </span>
    )
  })
}

export function Home() {
  const navigate = useNavigate()
  const { latitude, longitude, error: locationError, loading: locationLoading, retry } = useGeolocation()

  // Persistent state from Zustand (survives navigation)
  const mapCenter = useHomeStore((state) => state.mapCenter)
  const setMapCenter = useHomeStore((state) => state.setMapCenter)
  const mapBounds = useHomeStore((state) => state.mapBounds)
  const setMapBounds = useHomeStore((state) => state.setMapBounds)
  const snapshotMapState = useHomeStore((state) => state.snapshotMapState)
  const restoreMapSnapshot = useHomeStore((state) => state.restoreMapSnapshot)
  const pois = useHomeStore((state) => state.pois)
  const setPois = useHomeStore((state) => state.setPois)
  const selectedPoiId = useHomeStore((state) => state.selectedPoiId)
  const setSelectedPoiId = useHomeStore((state) => state.setSelectedPoiId)
  const expandedPoiId = useHomeStore((state) => state.expandedPoiId)
  const setExpandedPoiId = useHomeStore((state) => state.setExpandedPoiId)
  const searchDisplay = useHomeStore((state) => state.searchDisplay)
  const setSearchDisplay = useHomeStore((state) => state.setSearchDisplay)
  const searchQuery = useHomeStore((state) => state.searchQuery)
  const setSearchQuery = useHomeStore((state) => state.setSearchQuery)
  const currentZoom = useHomeStore((state) => state.currentZoom)
  const setCurrentZoom = useHomeStore((state) => state.setCurrentZoom)
  const lastSearchCategory = useHomeStore((state) => state.lastSearchCategory)
  const setLastSearchCategory = useHomeStore((state) => state.setLastSearchCategory)
  const lastSearchCenter = useHomeStore((state) => state.lastSearchCenter)
  const setLastSearchCenter = useHomeStore((state) => state.setLastSearchCenter)
  const includeUserLocationInViewport = useHomeStore((state) => state.includeUserLocationInViewport)
  const setIncludeUserLocationInViewport = useHomeStore((state) => state.setIncludeUserLocationInViewport)
  const clearResults = useHomeStore((state) => state.clearResults)

  // Local/transient state (can be reset on navigation)
  const [isTypeaheadOpen, setIsTypeaheadOpen] = useState(false)
  const [placeSuggestions, setPlaceSuggestions] = useState<POI[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [hasCenteredOnLocation, setHasCenteredOnLocation] = useState(false)
  const [isExpandingSearch, setIsExpandingSearch] = useState(false)
  const [hasMapMoved, setHasMapMoved] = useState(false)
  const [skipNextFitBounds, setSkipNextFitBounds] = useState(false)
  const [isPannedAwayFromLocation, setIsPannedAwayFromLocation] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasRestoredSnapshotRef = useRef(false)

  // Restore map snapshot on mount (if returning from place details)
  useEffect(() => {
    const restored = restoreMapSnapshot()
    if (restored) {
      hasRestoredSnapshotRef.current = true
      setHasCenteredOnLocation(true) // Mark as centered to prevent location override
    }
  }, [restoreMapSnapshot]) // Only run once on mount

  useEffect(() => {
    // Only center on user location if:
    // 1. We haven't centered yet
    // 2. We didn't restore from snapshot
    // 3. We don't have saved POIs
    if (
      latitude !== null &&
      longitude !== null &&
      !hasCenteredOnLocation &&
      !hasRestoredSnapshotRef.current &&
      pois.length === 0
    ) {
      const centered = { lat: latitude, lon: longitude }
      setMapCenter(centered)
      setHasCenteredOnLocation(true)
    }
  }, [latitude, longitude, hasCenteredOnLocation, pois.length, setMapCenter])

  const categoryList = useMemo(
    () =>
      Object.entries(CATEGORY_META).map(([key, value]) => ({
        className: key as CategoryKey,
        label: value.label,
      })),
    []
  )

  const trimmedQuery = searchQuery.trim()

  const categorySuggestions: CategorySuggestion[] = useMemo(() => {
    if (!trimmedQuery) {
      return POPULAR_CATEGORY_KEYS.map((key) => ({
        kind: 'category' as const,
        className: key,
        label: CATEGORY_META[key].label,
      }))
    }
    const lowerQuery = trimmedQuery.toLowerCase()
    return categoryList
      .filter((category) => category.label.toLowerCase().includes(lowerQuery))
      .slice(0, 6)
      .map((category) => ({
        kind: 'category' as const,
        className: category.className,
        label: category.label,
      }))
  }, [trimmedQuery, categoryList])

  useEffect(() => {
    if (!isTypeaheadOpen) {
      return
    }

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setPlaceSuggestions([])
      setSuggestionError(null)
      setIsFetchingSuggestions(false)
      return
    }

    let cancelled = false
    setIsFetchingSuggestions(true)
    setSuggestionError(null)

    // Debounce: wait 300ms after user stops typing before fetching
    const debounceTimeout = setTimeout(() => {
      const fetchSuggestions = async () => {
        try {
          const request: SearchRequest = {
            query: trimmedQuery,
            limit: 5,
            lat: latitude ?? undefined,
            lon: longitude ?? undefined,
            radius: 5000, // Use a reasonable default for text search
          }
          const results = await placesApi.search(request)
          if (!cancelled) {
            setPlaceSuggestions(results)
          }
        } catch (error) {
          console.error('Failed to fetch suggestions', error)
          if (!cancelled) {
            setSuggestionError('Search is unavailable right now. Try again shortly.')
          }
        } finally {
          if (!cancelled) {
            setIsFetchingSuggestions(false)
          }
        }
      }

      void fetchSuggestions()
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(debounceTimeout)
    }
  }, [trimmedQuery, latitude, longitude, isTypeaheadOpen])

  // Filter place suggestions to only show those matching current query
  const filteredPlaceSuggestions = useMemo(() => {
    if (!trimmedQuery || trimmedQuery.length < MIN_QUERY_LENGTH) {
      return []
    }
    const lowerQuery = trimmedQuery.toLowerCase()
    return placeSuggestions.filter((poi) => {
      const name = (poi.name || '').toLowerCase()
      const category = (poi.class || '').replace(/_/g, ' ').toLowerCase()
      return name.includes(lowerQuery) || category.includes(lowerQuery)
    })
  }, [placeSuggestions, trimmedQuery])

  useEffect(() => {
    if (pois.length === 0) {
      setSelectedPoiId(null)
      return
    }

    // Check if current selection is still in the POI list
    if (selectedPoiId) {
      const stillExists = pois.some((poi) => `${poi.osm_type}-${poi.osm_id}` === selectedPoiId)
      if (!stillExists) {
        setSelectedPoiId(null)
      }
    }
  }, [pois, selectedPoiId, setSelectedPoiId])

  const openTypeahead = useCallback(() => {
    setIsTypeaheadOpen(true)
    setSearchQuery('')
    setPlaceSuggestions([])
    setSuggestionError(null)
    setModalError(null)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }, [setIsTypeaheadOpen, setSearchQuery, setPlaceSuggestions, setSuggestionError, setModalError])

  const closeTypeahead = useCallback(() => {
    setIsTypeaheadOpen(false)
    setSearchQuery('')
    setPlaceSuggestions([])
    setSuggestionError(null)
    setModalError(null)
  }, [setIsTypeaheadOpen, setSearchQuery, setPlaceSuggestions, setSuggestionError, setModalError])

  const selectPlaceSuggestion = useCallback(
    (poi: POI) => {
      setIncludeUserLocationInViewport(false)
      setPois([poi])
      setSelectedPoiId(`${poi.osm_type}-${poi.osm_id}`)
      setMapCenter({ lat: poi.lat, lon: poi.lon })
      setSearchDisplay(poi.name || 'Unnamed location')
      setSearchError(null)
      closeTypeahead()

      // Reset search expansion state (place search, not category)
      setLastSearchCategory(null)
      setLastSearchCenter(null)
      setHasMapMoved(false)
    },
    [
      closeTypeahead,
      setHasMapMoved,
      setIncludeUserLocationInViewport,
      setLastSearchCategory,
      setLastSearchCenter,
      setMapCenter,
      setPois,
      setSearchDisplay,
      setSearchError,
      setSelectedPoiId,
    ]
  )

  // Progressive bbox search: start at high zoom, expand until we find results
  const searchCategoryProgressive = useCallback(
    async (
      className: CategoryKey,
      centerLat: number,
      centerLon: number,
      startZoom: number = INITIAL_ZOOM
    ): Promise<{ results: POI[]; finalZoom: number }> => {
      let currentSearchZoom = startZoom

      while (currentSearchZoom >= MIN_ZOOM) {
        const bbox = calculateBboxFromZoom(centerLat, centerLon, currentSearchZoom)

        try {
          const results = await placesApi.getBbox({
            ...bbox,
            class: className,
            limit: 100,
          })

          if (results.length > 0) {
            return { results, finalZoom: currentSearchZoom }
          }
        } catch (error) {
          console.error(`Bbox search failed at zoom ${currentSearchZoom}`, error)
          throw error
        }

        // No results at this zoom, try one level out
        currentSearchZoom -= 1
      }

      // Reached minimum zoom with no results
      return { results: [], finalZoom: MIN_ZOOM }
    },
    []
  )

  const selectCategorySuggestion = useCallback(
    async (className: CategoryKey, label: string) => {
      if (latitude === null || longitude === null) {
        setModalError('Enable location services to search nearby categories.')
        return
      }

      closeTypeahead()
      setSearchDisplay(label)
      setSearchError(null)
      setSelectedPoiId(null)
      setIsExpandingSearch(true)

      // Use current map center if available, otherwise fall back to user location
      const searchLat = mapCenter.lat
      const searchLon = mapCenter.lon

      // Reset search state
      setLastSearchCategory(className)
      setLastSearchCenter({ lat: searchLat, lon: searchLon })
      setHasMapMoved(false)

      // Always show the user location while running a nearby search (when available)
      const hasUserLocation = latitude !== null && longitude !== null
      setIncludeUserLocationInViewport(hasUserLocation)

      try {
        const { results, finalZoom } = await searchCategoryProgressive(className, searchLat, searchLon)

        setPois(results)
        setCurrentZoom(finalZoom)

        if (results.length > 0) {
          setMapCenter({ lat: searchLat, lon: searchLon })
          setSearchError(null)
        } else {
          setSearchError(`No ${label.toLowerCase()} found nearby.`)
        }
      } catch (error) {
        console.error('Failed to load category results', error)
        setSearchError('Something went wrong while loading results.')
      } finally {
        setIsExpandingSearch(false)
      }
    },
    [
      closeTypeahead,
      latitude,
      longitude,
      mapCenter,
      searchCategoryProgressive,
      setCurrentZoom,
      setHasMapMoved,
      setIncludeUserLocationInViewport,
      setIsExpandingSearch,
      setLastSearchCategory,
      setLastSearchCenter,
      setMapCenter,
      setModalError,
      setPois,
      setSearchDisplay,
      setSearchError,
      setSelectedPoiId,
    ]
  )

  const handleSearchAction = useCallback(async () => {
    if (!lastSearchCategory || !lastSearchCenter) return

    setIsExpandingSearch(true)
    setSearchError(null)
    const hasUserLocation = latitude !== null && longitude !== null

    try {
      if (hasMapMoved && mapBounds) {
        // "Search Here" - search within current map bounds
        const bounds = mapBounds

        const results = await placesApi.getBbox({
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west,
          class: lastSearchCategory,
          limit: 100,
        })

        const centerFromBounds = {
          lat: (bounds.north + bounds.south) / 2,
          lon: (bounds.east + bounds.west) / 2,
        }

        setSkipNextFitBounds(true) // Don't refit bounds when these results arrive
        setPois(results)
        setLastSearchCenter(centerFromBounds)
        setMapCenter(centerFromBounds)
        setIncludeUserLocationInViewport(hasUserLocation)
        setHasMapMoved(false)

        if (results.length === 0) {
          setSearchError('No results found in this area.')
        }
      } else {
        // "Expand Search" - zoom out one level and search
        const newZoom = Math.max(currentZoom - 1, MIN_ZOOM)

        if (newZoom === currentZoom) {
          // Already at minimum zoom
          setSearchError('Already showing maximum search area.')
          return
        }

        const bbox = calculateBboxFromZoom(lastSearchCenter.lat, lastSearchCenter.lon, newZoom)
        const results = await placesApi.getBbox({
          ...bbox,
          class: lastSearchCategory,
          limit: 100,
        })

        setPois(results)
        setCurrentZoom(newZoom)
        setIncludeUserLocationInViewport(hasUserLocation)

        if (results.length === 0) {
          setSearchError('No additional results found.')
        }
      }
    } catch (error) {
      console.error('Failed to expand search', error)
      setSearchError('Something went wrong while searching.')
    } finally {
      setIsExpandingSearch(false)
    }
  }, [
    currentZoom,
    hasMapMoved,
    lastSearchCategory,
    lastSearchCenter,
    mapBounds,
    setCurrentZoom,
    setHasMapMoved,
    latitude,
    longitude,
    setIncludeUserLocationInViewport,
    setLastSearchCenter,
    setMapCenter,
    setPois,
    setIsExpandingSearch,
    setSearchError,
    setSkipNextFitBounds,
  ])

  const handleMapMove = useCallback((newCenter: { lat: number; lon: number }) => {
    setMapCenter(newCenter)

    // Check if panned away from user location
    if (latitude !== null && longitude !== null) {
      const latDiff = Math.abs(newCenter.lat - latitude)
      const lonDiff = Math.abs(newCenter.lon - longitude)
      setIsPannedAwayFromLocation(latDiff > MAP_MOVE_THRESHOLD || lonDiff > MAP_MOVE_THRESHOLD)
    }

    // Check if panned away from last search center
    if (!lastSearchCenter) return

    const latDiff = Math.abs(newCenter.lat - lastSearchCenter.lat)
    const lonDiff = Math.abs(newCenter.lon - lastSearchCenter.lon)

    if (latDiff > MAP_MOVE_THRESHOLD || lonDiff > MAP_MOVE_THRESHOLD) {
      setHasMapMoved(true)
    }
  }, [lastSearchCenter, latitude, longitude, setMapCenter, setHasMapMoved])

  const handleMapBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    const prev = mapBounds

    // Only update if bounds actually changed significantly
    if (prev) {
      const threshold = 0.001 // Larger threshold to avoid excessive updates (~100m)
      if (
        Math.abs(prev.north - bounds.north) < threshold &&
        Math.abs(prev.south - bounds.south) < threshold &&
        Math.abs(prev.east - bounds.east) < threshold &&
        Math.abs(prev.west - bounds.west) < threshold
      ) {
        return
      }
    }

    setMapBounds(bounds)
  }, [mapBounds, setMapBounds])

  const handleMarkerClick = useCallback((poi: POI) => {
    const poiKey = `${poi.osm_type}-${poi.osm_id}`
    setSelectedPoiId(poiKey)
    setMapCenter({ lat: poi.lat, lon: poi.lon })

    // Scroll to the corresponding card
    setTimeout(() => {
      const cardElement = document.getElementById(`poi-card-${poiKey}`)
      cardElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }, [setMapCenter, setSelectedPoiId])

  const handleCardClick = useCallback((poi: POI) => {
    const poiKey = `${poi.osm_type}-${poi.osm_id}`

    // If this POI is not currently expanded, snapshot the map state before zooming in
    if (poiKey !== expandedPoiId) {
      snapshotMapState()
    }

    setSelectedPoiId(poiKey)
    setExpandedPoiId(poiKey === expandedPoiId ? null : poiKey)
    setMapCenter({ lat: poi.lat, lon: poi.lon })
  }, [expandedPoiId, setExpandedPoiId, setMapCenter, setSelectedPoiId, snapshotMapState])

  const handleCheckIn = useCallback((poi: POI) => {
    // Navigate to place details (snapshot already taken when card was expanded)
    navigate(`/places/${poi.osm_type}/${poi.osm_id}`)
  }, [navigate])

  const handleClearResults = useCallback(() => {
    clearResults()
    setHasMapMoved(false)
    setSkipNextFitBounds(false)
    setSearchError(null)
  }, [clearResults, setHasMapMoved, setSkipNextFitBounds, setSearchError])

  const renderSuggestion = (suggestion: Suggestion, index: number) => {
    if (suggestion.kind === 'category') {
      const IconComponent = CATEGORY_META[suggestion.className].Icon
      return (
        <button
          key={`category-${suggestion.className}-${index}`}
          className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 focus:bg-gray-100 focus:outline-none transition"
          onClick={() => selectCategorySuggestion(suggestion.className, suggestion.label)}
        >
          <div className="flex items-center space-x-3">
            <div className="text-primary-600">
              <IconComponent size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{highlightText(suggestion.label, trimmedQuery)}</p>
              <p className="text-xs text-gray-500">Category</p>
            </div>
          </div>
          <IconChevronRight size={16} className="text-gray-400" />
        </button>
      )
    }

    const iconMeta = CATEGORY_META[suggestion.poi.class as CategoryKey]
    const IconComponent = iconMeta?.Icon

    // Calculate distance if user location is available
    let distance: number | undefined
    if (latitude !== null && longitude !== null) {
      distance = calculateDistance(latitude, longitude, suggestion.poi.lat, suggestion.poi.lon)
    }

    return (
      <button
        key={`place-${suggestion.poi.osm_type}-${suggestion.poi.osm_id}`}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 focus:bg-gray-100 focus:outline-none transition"
        onClick={() => selectPlaceSuggestion(suggestion.poi)}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="text-primary-600 flex-shrink-0">
            {IconComponent ? <IconComponent size={22} /> : <IconMapSearch size={22} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {highlightText(suggestion.poi.name || 'Unnamed location', trimmedQuery)}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {suggestion.poi.class?.replace(/_/g, ' ') || 'POI'}
              {distance !== undefined && (
                <span className="text-gray-400"> • {formatDistance(distance)}</span>
              )}
            </p>
          </div>
        </div>
        <IconChevronRight size={16} className="text-gray-400 flex-shrink-0" />
      </button>
    )
  }

  const combinedSuggestions: Suggestion[] = [
    ...categorySuggestions,
    ...filteredPlaceSuggestions.map((poi) => ({ kind: 'place' as const, poi })),
  ]

  const isLocationReady = latitude !== null && longitude !== null && hasCenteredOnLocation
  const userLocation = isLocationReady ? { lat: latitude, lon: longitude } : null
  const shouldRenderMap = isLocationReady || pois.length > 0
  const highlightTerm = trimmedQuery.length >= MIN_QUERY_LENGTH ? trimmedQuery : undefined

  // Calculate visible POIs within current map bounds
  const visiblePoisCount = useMemo(() => {
    if (!mapBounds || pois.length === 0) return pois.length

    return pois.filter(poi => {
      return (
        poi.lat >= mapBounds.south &&
        poi.lat <= mapBounds.north &&
        poi.lon >= mapBounds.west &&
        poi.lon <= mapBounds.east
      )
    }).length
  }, [pois, mapBounds])

  // Show expand/search here button when:
  // 1. We have a category search active
  // 2. We have some results
  // 3. Either: visible results are below threshold OR user has panned the map
  const shouldShowSearchButton =
    lastSearchCategory !== null &&
    pois.length > 0 &&
    (visiblePoisCount < MIN_RESULTS_THRESHOLD || hasMapMoved) &&
    !isTypeaheadOpen

  const hasResults = pois.length > 0
  const shouldShowClearButton = hasResults && !isTypeaheadOpen
  // Show recenter when panned away, regardless of other buttons
  const shouldShowRecenterButton = isPannedAwayFromLocation && latitude !== null && longitude !== null
  const searchPlaceholder = isPannedAwayFromLocation ? 'Search here' : 'Search nearby'
  const displayedSearchLabel =
    searchDisplay && searchDisplay !== DEFAULT_SEARCH_DISPLAY ? searchDisplay : searchPlaceholder

  const handleRecenter = useCallback(() => {
    if (latitude === null || longitude === null) return

    // Clear any active search to ensure map recenters properly
    if (hasResults) {
      clearResults()
    }

    // Set center and reset panned state IMMEDIATELY before the map moves
    // This ensures the placeholder updates right away
    setIsPannedAwayFromLocation(false)
    setMapCenter({ lat: latitude, lon: longitude })

    // Reset zoom to initial zoom level
    setCurrentZoom(INITIAL_ZOOM)

    // Also clear search display to show default placeholder
    setSearchDisplay('')
  }, [latitude, longitude, hasResults, clearResults, setMapCenter, setSearchDisplay, setCurrentZoom])

  return (
    <div className="flex flex-col w-full h-full">
      {/* Map Container - Dynamic height */}
      <div
        className="relative transition-all duration-300 ease-in-out"
        style={{ height: hasResults ? '60%' : '100%' }}
      >
        {shouldRenderMap ? (
          <SearchMap
            center={mapCenter}
            pois={pois}
            selectedPoiId={selectedPoiId || undefined}
            userLocation={userLocation}
            skipFitBounds={skipNextFitBounds}
            includeUserLocationInFitBounds={includeUserLocationInViewport}
            desiredZoom={currentZoom}
            onMarkerClick={handleMarkerClick}
            onMapMove={handleMapMove}
            onMapBoundsChange={handleMapBoundsChange}
            onFitBoundsComplete={() => setSkipNextFitBounds(false)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-600 space-y-3">
            {locationLoading ? (
              <>
                <IconLoader2 size={28} className="animate-spin text-primary-600" />
                <p className="text-sm font-medium">Locating you…</p>
                <p className="text-xs text-gray-500">Allow location access to start your nearby search.</p>
              </>
            ) : locationError ? (
              <>
                <p className="text-sm font-semibold text-gray-700 text-center px-6">{locationError}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <IconMapSearch size={32} className="text-gray-400" />
                <p className="text-sm text-gray-600 px-6 text-center">
                  We&apos;ll show the map once we know where you are. You can still search by name while we wait.
                </p>
              </>
            )}
          </div>
        )}

        {/* Search bar overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full px-4 max-w-xl">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={openTypeahead}
              className="flex-1 flex items-center space-x-2 bg-white border border-gray-200 rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition"
            >
              <IconSearch size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 truncate">{displayedSearchLabel}</span>
            </button>

            {shouldShowClearButton && (
              <button
                type="button"
                onClick={handleClearResults}
                className="p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition flex-shrink-0"
                aria-label="Clear results"
                title="Clear results"
              >
                <IconX size={18} className="text-gray-600" />
              </button>
            )}

            {shouldShowSearchButton && (
              <button
                type="button"
                onClick={handleSearchAction}
                disabled={isExpandingSearch}
                className="p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition disabled:opacity-50 flex-shrink-0"
                aria-label={hasMapMoved ? 'Search this area' : 'Expand search area'}
                title={hasMapMoved ? 'Search Here' : 'Expand Search'}
              >
                {isExpandingSearch ? (
                  <IconLoader2 size={18} className="animate-spin text-gray-600" />
                ) : hasMapMoved ? (
                  <IconMapSearch size={18} className="text-primary-600" />
                ) : (
                  <IconRadar size={18} className="text-gray-600" />
                )}
              </button>
            )}

            {shouldShowRecenterButton && (
              <button
                type="button"
                onClick={handleRecenter}
                className="p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition flex-shrink-0"
                aria-label="Recenter to your location"
                title="Recenter"
              >
                <IconCurrentLocation size={18} className="text-blue-600" />
              </button>
            )}
          </div>

          {locationError && (
            <p className="mt-2 text-xs text-red-600 bg-white/90 rounded-md px-3 py-2 border border-red-200">
              {locationError}{' '}
              <button type="button" className="underline" onClick={retry}>
                Try again
              </button>
            </p>
          )}
        </div>

      </div>

      {/* Fixed Results List - Slides in when there are results */}
      {hasResults && (
        <div
          className="flex flex-col border-t-2 border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out animate-slide-up"
          style={{ height: '40%' }}
        >
          {/* Results Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${pois.length >= 100 ? 'text-amber-700' : 'text-gray-900'}`}>
                {pois.length} {pois.length === 1 ? 'Result' : 'Results'}
                {pois.length >= 100 && <span className="text-xs font-normal text-amber-600 ml-1">(max)</span>}
              </h3>
              {searchError && <p className="text-xs text-red-600">{searchError}</p>}
            </div>
          </div>

          {/* Scrollable Results */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {pois.map((poi) => {
              const poiKey = `${poi.osm_type}-${poi.osm_id}`
              const isActiveCard = selectedPoiId === poiKey
              const isExpandedCard = expandedPoiId === poiKey

              return (
                <div
                  key={poiKey}
                  className="mb-3 last:mb-0"
                  id={`poi-card-${poiKey}`}
                >
                  <POICard
                    poi={poi}
                    onClick={() => handleCardClick(poi)}
                    onDetailsClick={() => handleCheckIn(poi)}
                    highlight={highlightTerm}
                    isActive={isActiveCard}
                    isExpanded={isExpandedCard}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Typeahead overlay */}
      {isTypeaheadOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center space-x-2 px-4 py-3 border-b border-gray-200">
            <button
              type="button"
              onClick={closeTypeahead}
              className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <IconX size={18} />
            </button>
            <div className="flex-1 relative">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search for places or categories"
                className="w-full pl-9 pr-12 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                style={{ fontSize: '16px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {modalError && (
              <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
                {modalError}
              </div>
            )}
            <div className="py-2">
              {combinedSuggestions.length === 0 && trimmedQuery.length < MIN_QUERY_LENGTH && (
                <div className="px-4 py-8 text-center text-sm text-gray-500 space-y-2">
                  <IconCategory size={32} className="mx-auto text-gray-300" />
                  <p>Start typing to search for places or explore popular categories below.</p>
                </div>
              )}

              {combinedSuggestions.length === 0 && trimmedQuery.length >= MIN_QUERY_LENGTH && !isFetchingSuggestions && (
                <div className="px-4 py-8 text-center text-sm text-gray-500 space-y-2">
                  <IconMapSearch size={32} className="mx-auto text-gray-300" />
                  <p>No matches yet. Try a different name or category.</p>
                </div>
              )}

              {suggestionError && (
                <div className="px-4 py-2 text-sm text-red-600">{suggestionError}</div>
              )}

              {/* Categories Section */}
              {categorySuggestions.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</h3>
                  </div>
                  {categorySuggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
                </div>
              )}

              {/* Places Section */}
              {filteredPlaceSuggestions.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Places</h3>
                  </div>
                  {filteredPlaceSuggestions.map((poi, index) => renderSuggestion({ kind: 'place', poi }, index))}
                </div>
              )}

              {isFetchingSuggestions && (
                <div className="px-4 py-3 text-sm text-gray-500 flex items-center space-x-2">
                  <IconLoader2 size={16} className="animate-spin" />
                  <span>Searching…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
