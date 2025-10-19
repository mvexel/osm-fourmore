import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconSearch,
  IconX,
  IconLoader2,
  IconChevronRight,
  IconCategory,
  IconMapSearch,
  IconRadar,
} from '@tabler/icons-react'
import { SearchMap } from '../components/SearchMap'
import { placesApi } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'
import type { POI, SearchRequest } from '../types'
import { CATEGORY_META, type CategoryKey } from '../generated/category_metadata'
import { POICard } from '../components/POICard'
import { useNavigate } from 'react-router-dom'
import { calculateBboxFromZoom } from '../utils/mapUtils'
import { useHomeStore } from '../stores/homeStore'

const INITIAL_ZOOM = 17 // Street-level detail
const MIN_ZOOM = 12 // City-level fallback
const MIN_RESULTS_THRESHOLD = 10
const MAP_MOVE_THRESHOLD = 0.002 // ~200m at mid-latitudes
const MIN_QUERY_LENGTH = 2
const POPULAR_CATEGORY_KEYS: CategoryKey[] = [
  'restaurant',
  'cafe_bakery',
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
  const [, forceUpdate] = useState({})

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

    return () => {
      cancelled = true
    }
  }, [trimmedQuery, latitude, longitude, isTypeaheadOpen])

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
  }, [])

  const closeTypeahead = useCallback(() => {
    setIsTypeaheadOpen(false)
    setSearchQuery('')
    setPlaceSuggestions([])
    setSuggestionError(null)
    setModalError(null)
  }, [])

  const selectPlaceSuggestion = useCallback(
    (poi: POI) => {
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
    [closeTypeahead]
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

      // Reset search state
      setLastSearchCategory(className)
      setLastSearchCenter({ lat: latitude, lon: longitude })
      setHasMapMoved(false)

      try {
        const { results, finalZoom } = await searchCategoryProgressive(className, latitude, longitude)

        setPois(results)
        setCurrentZoom(finalZoom)

        if (results.length > 0) {
          setMapCenter({ lat: latitude, lon: longitude })
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
    [latitude, longitude, closeTypeahead, searchCategoryProgressive]
  )

  const handleSearchAction = useCallback(async () => {
    if (!lastSearchCategory || !lastSearchCenter) return

    setIsExpandingSearch(true)
    setSearchError(null)

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

        setSkipNextFitBounds(true) // Don't refit bounds when these results arrive
        setPois(results)
        setLastSearchCenter(mapCenter)
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
  }, [lastSearchCategory, lastSearchCenter, hasMapMoved, mapCenter, currentZoom])

  const handleMapMove = useCallback((newCenter: { lat: number; lon: number }) => {
    if (!lastSearchCenter) return

    const latDiff = Math.abs(newCenter.lat - lastSearchCenter.lat)
    const lonDiff = Math.abs(newCenter.lon - lastSearchCenter.lon)

    if (latDiff > MAP_MOVE_THRESHOLD || lonDiff > MAP_MOVE_THRESHOLD) {
      setHasMapMoved(true)
    }
  }, [lastSearchCenter])

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
    forceUpdate({}) // Force re-render to update visible POI count
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
  }, [])

  const handleCardClick = useCallback((poi: POI) => {
    const poiKey = `${poi.osm_type}-${poi.osm_id}`

    // If this POI is not currently expanded, snapshot the map state before zooming in
    if (poiKey !== expandedPoiId) {
      snapshotMapState()
    }

    setSelectedPoiId(poiKey)
    setExpandedPoiId(poiKey === expandedPoiId ? null : poiKey)
    setMapCenter({ lat: poi.lat, lon: poi.lon })
  }, [expandedPoiId, snapshotMapState])

  const handleCheckIn = useCallback((poi: POI) => {
    // Navigate to place details (snapshot already taken when card was expanded)
    navigate(`/places/${poi.osm_type}/${poi.osm_id}`)
  }, [navigate])

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

    return (
      <button
        key={`place-${suggestion.poi.osm_type}-${suggestion.poi.osm_id}`}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 focus:bg-gray-100 focus:outline-none transition"
        onClick={() => selectPlaceSuggestion(suggestion.poi)}
      >
        <div className="flex items-center space-x-3">
          <div className="text-primary-600">
            {IconComponent ? <IconComponent size={22} /> : <IconMapSearch size={22} />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {highlightText(suggestion.poi.name || 'Unnamed location', trimmedQuery)}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {suggestion.poi.class?.replace(/_/g, ' ') || 'POI'}
            </p>
          </div>
        </div>
        <IconChevronRight size={16} className="text-gray-400" />
      </button>
    )
  }

  const combinedSuggestions: Suggestion[] = [
    ...categorySuggestions,
    ...placeSuggestions.map((poi) => ({ kind: 'place' as const, poi })),
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
              <span className="text-sm font-medium text-gray-700 truncate">{searchDisplay}</span>
            </button>

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
              <h3 className="text-sm font-semibold text-gray-900">
                {pois.length} {pois.length === 1 ? 'Result' : 'Results'}
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
                className="w-full pl-9 pr-12 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
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

              {combinedSuggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}

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
