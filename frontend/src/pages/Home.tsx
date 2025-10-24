import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconSearch,
  IconX,
  IconLoader2,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconCategory,
  IconMapSearch,
  IconRadar,
  IconCurrentLocation,
} from '@tabler/icons-react'
import { SearchMap } from '../components/SearchMap'
import { useGeolocation } from '../hooks/useGeolocation'
import type { POI } from '../types'
import { CATEGORY_META, type CategoryKey } from '../generated/category_metadata'
import { POICard } from '../components/POICard'
import { useNavigate } from 'react-router-dom'
import { calculateDistance, formatDistance } from '../utils/mapUtils'
import { DEFAULT_SEARCH_DISPLAY } from '../stores/homeStore'
import { useHomeStoreSelectors } from '../hooks/useHomeStoreSelectors'
import { usePlaceSuggestions } from '../hooks/usePlaceSuggestions'
import { useCategorySearch } from '../hooks/useCategorySearch'
import { placesApi } from '../services/api'

const INITIAL_ZOOM = 17 // Street-level detail
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
  const { map, results, search, actions } = useHomeStoreSelectors()
  const mapCenter = map.center
  const mapBounds = map.bounds
  const currentZoom = map.zoom
  const includeUserLocationInViewport = map.includeUserLocation

  const pois = results.pois
  const selectedPoiId = results.selectedPoiId
  const expandedPoiId = results.expandedPoiId

  const searchDisplay = search.display
  const searchQuery = search.query
  const lastSearchCategory = search.lastCategory
  const lastSearchCenter = search.lastCenter

  const {
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
  } = actions

  // Local/transient state (can be reset on navigation)
  const [isTypeaheadOpen, setIsTypeaheadOpen] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [hasCenteredOnLocation, setHasCenteredOnLocation] = useState(false)
  const [hasMapMoved, setHasMapMoved] = useState(false)
  const [skipNextFitBounds, setSkipNextFitBounds] = useState(false)
  const [isPannedAwayFromLocation, setIsPannedAwayFromLocation] = useState(false)
  const [isResultsExpanded, setIsResultsExpanded] = useState(false)
  const [isLoadingInitialPOIs, setIsLoadingInitialPOIs] = useState(false)
  const [isFetchingViewportPOIs, setIsFetchingViewportPOIs] = useState(false)
  const resultsOverlayRef = useRef<HTMLDivElement | null>(null)
  const [resultsOverlayHeight, setResultsOverlayHeight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasRestoredSnapshotRef = useRef(false)
  const isInitialShowAllRef = useRef(false)
  const viewportFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewportFetchIdRef = useRef(0)
  const skipResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const userLocation = useMemo(() => {
    if (latitude === null || longitude === null) {
      return null
    }
    return { lat: latitude, lon: longitude }
  }, [latitude, longitude])

  const {
    suggestions: filteredPlaceSuggestions,
    isFetching: isFetchingSuggestions,
    error: suggestionError,
    hasMinimumQuery,
    reset: resetSuggestions,
    setError: setSuggestionError,
  } = usePlaceSuggestions({
    query: searchQuery,
    isEnabled: isTypeaheadOpen,
    location: userLocation,
    minQueryLength: MIN_QUERY_LENGTH,
  })

  const resetMapMovement = useCallback(() => {
    setHasMapMoved(false)
  }, [])

  const { searchCategory, continueSearch, isSearching } = useCategorySearch({
    mapCenter,
    mapBounds,
    currentZoom,
    lastSearchCategory,
    lastSearchCenter,
    setSearchError,
    setSkipNextFitBounds,
    resetMapMovement,
    actions: {
      setPois,
      setMapCenter,
      setCurrentZoom,
      setIncludeUserLocationInViewport,
      setLastSearchCategory,
      setLastSearchCenter,
    },
    userLocation,
  })

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

  // Fetch all places in the current viewport on initial load
  useEffect(() => {
    // Only fetch if:
    // 1. We have map bounds
    // 2. We don't have any POIs yet
    // 3. We're not in the middle of a search
    // 4. Map has been centered on location
    if (
      mapBounds &&
      pois.length === 0 &&
      !isSearching &&
      hasCenteredOnLocation &&
      !lastSearchCategory
    ) {
      // Set ref BEFORE starting async operation
      isInitialShowAllRef.current = true

      // Set loading state immediately so bottom bar appears
      setIsLoadingInitialPOIs(true)

      const fetchInitialPOIs = async () => {
        try {
          const results = await placesApi.getBbox({
            north: mapBounds.north,
            south: mapBounds.south,
            east: mapBounds.east,
            west: mapBounds.west,
            limit: 100,
          })
          setPois(results)
          // setSearchDisplay('All places nearby')
          // Reset the ref after a short delay to allow SearchMap to process with skipFitBounds=true
          setTimeout(() => {
            isInitialShowAllRef.current = false
          }, 100)
        } catch (error) {
          console.error('Failed to fetch initial POIs', error)
          setSearchError('Failed to load nearby places')
          isInitialShowAllRef.current = false
        } finally {
          setIsLoadingInitialPOIs(false)
        }
      }

      void fetchInitialPOIs()
    }
  }, [mapBounds, pois.length, isSearching, hasCenteredOnLocation, lastSearchCategory, setPois, setSearchDisplay, setIsLoadingInitialPOIs, setSearchError])

  // Auto-refresh POIs after user pans the map
  useEffect(() => {
    if (!mapBounds || !hasMapMoved) {
      return
    }

    if (viewportFetchTimeoutRef.current) {
      clearTimeout(viewportFetchTimeoutRef.current)
    }

    const boundsSnapshot = mapBounds
    const activeCategory = lastSearchCategory
    const shouldIncludeUserLocation = !activeCategory && Boolean(userLocation)

    viewportFetchTimeoutRef.current = setTimeout(() => {
      viewportFetchTimeoutRef.current = null
      const fetchId = ++viewportFetchIdRef.current

      setIsFetchingViewportPOIs(true)
      setSkipNextFitBounds(true)
      setSearchError(null)

      const params = {
        north: boundsSnapshot.north,
        south: boundsSnapshot.south,
        east: boundsSnapshot.east,
        west: boundsSnapshot.west,
        limit: 100,
        ...(activeCategory ? { class: activeCategory } : {}),
      }

      const loadViewportPois = async () => {
        try {
          const results = await placesApi.getBbox(params)
          if (fetchId !== viewportFetchIdRef.current) {
            return
          }

          setPois(results)
          if (results.length === 0) {
            setSelectedPoiId(null)
            setExpandedPoiId(null)
          }

          if (activeCategory) {
            const centerFromBounds = {
              lat: (boundsSnapshot.north + boundsSnapshot.south) / 2,
              lon: (boundsSnapshot.east + boundsSnapshot.west) / 2,
            }
            setLastSearchCenter(centerFromBounds)
            setIncludeUserLocationInViewport(false)
          } else {
            setIncludeUserLocationInViewport(shouldIncludeUserLocation)
          }

          if (results.length === 0) {
            setSearchError(activeCategory ? 'No results found in this area.' : 'No places found in this area.')
          } else {
            setSearchError(null)
          }
        } catch (error) {
          if (fetchId === viewportFetchIdRef.current) {
            console.error('Failed to load places for current viewport', error)
            setSearchError('Failed to load places for this area.')
          }
        } finally {
          if (fetchId === viewportFetchIdRef.current) {
            setIsFetchingViewportPOIs(false)
            resetMapMovement()
            const latestFetchId = fetchId
            if (skipResetTimeoutRef.current) {
              clearTimeout(skipResetTimeoutRef.current)
              skipResetTimeoutRef.current = null
            }
            skipResetTimeoutRef.current = setTimeout(() => {
              if (latestFetchId === viewportFetchIdRef.current) {
                setSkipNextFitBounds(false)
              }
              skipResetTimeoutRef.current = null
            }, 0)
          }
        }
      }

      void loadViewportPois()
    }, 400)

    return () => {
      if (viewportFetchTimeoutRef.current) {
        clearTimeout(viewportFetchTimeoutRef.current)
        viewportFetchTimeoutRef.current = null
      }
    }
  }, [
    hasMapMoved,
    lastSearchCategory,
    mapBounds,
    resetMapMovement,
    setIncludeUserLocationInViewport,
    setLastSearchCenter,
    setExpandedPoiId,
    setPois,
    setSelectedPoiId,
    setSearchError,
    setSkipNextFitBounds,
    userLocation,
  ])

  useEffect(() => {
    return () => {
      if (skipResetTimeoutRef.current) {
        clearTimeout(skipResetTimeoutRef.current)
        skipResetTimeoutRef.current = null
      }
    }
  }, [])

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
    setSuggestionError(null)
    setModalError(null)
    resetSuggestions()
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }, [resetSuggestions, setIsTypeaheadOpen, setModalError, setSearchQuery, setSuggestionError])

  const closeTypeahead = useCallback(() => {
    setIsTypeaheadOpen(false)
    setSearchQuery('')
    setSuggestionError(null)
    setModalError(null)
    resetSuggestions()
  }, [resetSuggestions, setIsTypeaheadOpen, setModalError, setSearchQuery, setSuggestionError])

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
      resetMapMovement()
      setIsPannedAwayFromLocation(false)
    },
    [
      closeTypeahead,
      setIncludeUserLocationInViewport,
      setLastSearchCategory,
      setLastSearchCenter,
      setMapCenter,
      setPois,
      setSearchDisplay,
      setSearchError,
      setSelectedPoiId,
      resetMapMovement,
      setIsPannedAwayFromLocation,
    ]
  )

  // Progressive bbox search: start at high zoom, expand until we find results
  const selectCategorySuggestion = useCallback(
    (className: CategoryKey, label: string) => {
      if (!userLocation) {
        setModalError('Enable location services to search nearby categories.')
        return
      }

      closeTypeahead()
      setSearchDisplay(`Filter: ${label}`)
      setSearchError(null)
      setSelectedPoiId(null)
      setExpandedPoiId(null)
      setIsPannedAwayFromLocation(false)
      void searchCategory({ className, label })
    },
    [
      closeTypeahead,
      searchCategory,
      setExpandedPoiId,
      setModalError,
      setSearchDisplay,
      setSearchError,
      setSelectedPoiId,
      setIsPannedAwayFromLocation,
      userLocation,
    ]
  )

  const handleSearchAction = useCallback(() => {
    if (isSearching || isFetchingViewportPOIs) return
    void continueSearch({ hasMapMoved })
  }, [continueSearch, hasMapMoved, isFetchingViewportPOIs, isSearching])

  const handleMapMove = useCallback((newView: { lat: number; lon: number; zoom: number }) => {
    const { lat, lon, zoom } = newView
    const previousCenter = mapCenter
    const nextCenter = { lat, lon }
    setMapCenter(nextCenter)
    setCurrentZoom(zoom)

    if (userLocation) {
      const latDiffFromUser = Math.abs(lat - userLocation.lat)
      const lonDiffFromUser = Math.abs(lon - userLocation.lon)
      setIsPannedAwayFromLocation(latDiffFromUser > MAP_MOVE_THRESHOLD || lonDiffFromUser > MAP_MOVE_THRESHOLD)
    }

    const referenceCenter = lastSearchCenter ?? previousCenter
    if (!referenceCenter) {
      return
    }

    const latDiff = Math.abs(lat - referenceCenter.lat)
    const lonDiff = Math.abs(lon - referenceCenter.lon)

    if (latDiff > MAP_MOVE_THRESHOLD || lonDiff > MAP_MOVE_THRESHOLD) {
      setHasMapMoved(true)
    }
  }, [lastSearchCenter, mapCenter, setCurrentZoom, setHasMapMoved, setIsPannedAwayFromLocation, setMapCenter, userLocation])

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
    snapshotMapState()
    setIsResultsExpanded(true)
    setSelectedPoiId(poiKey)
    setExpandedPoiId(poiKey)
    setMapCenter({ lat: poi.lat, lon: poi.lon })

    // Scroll to the corresponding card
    setTimeout(() => {
      const cardElement = document.getElementById(`poi-card-${poiKey}`)
      cardElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }, [setExpandedPoiId, setIsResultsExpanded, setMapCenter, setSelectedPoiId, snapshotMapState])

  const handleCardClick = useCallback((poi: POI) => {
    const poiKey = `${poi.osm_type}-${poi.osm_id}`

    // If this POI is not currently expanded, snapshot the map state before zooming in
    if (poiKey !== expandedPoiId) {
      snapshotMapState()
    }

    setIsResultsExpanded(true)
    setSelectedPoiId(poiKey)
    setExpandedPoiId(poiKey)
    setMapCenter({ lat: poi.lat, lon: poi.lon })
  }, [expandedPoiId, setExpandedPoiId, setIsResultsExpanded, setMapCenter, setSelectedPoiId, snapshotMapState])

  const handleMapClick = useCallback(() => {
    setSelectedPoiId(null)
    setExpandedPoiId(null)
    setIsResultsExpanded(false)
  }, [setExpandedPoiId, setIsResultsExpanded, setSelectedPoiId])

  const handleCheckIn = useCallback((poi: POI) => {
    // Navigate to place details (snapshot already taken when card was expanded)
    navigate(`/places/${poi.osm_type}/${poi.osm_id}`)
  }, [navigate])

  const handleClearResults = useCallback(() => {
    clearResults()
    resetMapMovement()
    setSkipNextFitBounds(false)
    setSearchError(null)
    setIsPannedAwayFromLocation(false)
  }, [clearResults, resetMapMovement, setIsPannedAwayFromLocation, setSkipNextFitBounds, setSearchError])

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
              <p className="text-xs text-gray-500">Filter • Category</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-600">Filter</span>
            <IconChevronRight size={16} className="text-gray-400" />
          </div>
        </button>
      )
    }

    const iconMeta = CATEGORY_META[suggestion.poi.class as CategoryKey]
    const IconComponent = iconMeta?.Icon

    // Calculate distance if user location is available
    let distance: number | undefined
    if (userLocation) {
      distance = calculateDistance(userLocation.lat, userLocation.lon, suggestion.poi.lat, suggestion.poi.lon)
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
              Search result • {suggestion.poi.class?.replace(/_/g, ' ') || 'POI'}
              {distance !== undefined && (
                <span className="text-gray-400"> • {formatDistance(distance)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-gray-400 flex-shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Result</span>
          <IconChevronRight size={16} />
        </div>
      </button>
    )
  }

  const combinedSuggestions: Suggestion[] = [
    ...categorySuggestions,
    ...filteredPlaceSuggestions.map((poi) => ({ kind: 'place' as const, poi })),
  ]

  const isLocationReady = Boolean(userLocation) && hasCenteredOnLocation
  const mapUserLocation = isLocationReady ? userLocation : null
  const shouldRenderMap = isLocationReady || pois.length > 0
  const highlightTerm = hasMinimumQuery ? trimmedQuery : undefined

  const displayedPois = useMemo(() => {
    if (!selectedPoiId) {
      return pois
    }

    const selectedPoi = pois.find((poi) => `${poi.osm_type}-${poi.osm_id}` === selectedPoiId)
    if (!selectedPoi) {
      return pois
    }

    const remainingPois = pois.filter((poi) => `${poi.osm_type}-${poi.osm_id}` !== selectedPoiId)
    return [selectedPoi, ...remainingPois]
  }, [pois, selectedPoiId])

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
  const shouldShowBottomBar = shouldRenderMap || isLoadingInitialPOIs || isFetchingViewportPOIs
  // Show recenter when panned away, regardless of other buttons
  const shouldShowRecenterButton = isPannedAwayFromLocation && Boolean(userLocation)
  const searchPlaceholder = isPannedAwayFromLocation ? 'Search / filter here' : 'Search / filter nearby'
  const displayedSearchLabel =
    searchDisplay && searchDisplay !== DEFAULT_SEARCH_DISPLAY ? searchDisplay : searchPlaceholder

  useEffect(() => {
    if (!shouldShowBottomBar || isTypeaheadOpen) {
      setResultsOverlayHeight(0)
      return
    }

    const node = resultsOverlayRef.current
    if (!node) {
      setResultsOverlayHeight(0)
      return
    }

    const updateHeight = () => {
      setResultsOverlayHeight(node.getBoundingClientRect().height)
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      updateHeight()
    })
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [
    isFetchingViewportPOIs,
    isLoadingInitialPOIs,
    isResultsExpanded,
    isTypeaheadOpen,
    pois.length,
    searchError,
    shouldShowBottomBar,
  ])

  const handleRecenter = useCallback(() => {
    if (!userLocation) return

    if (hasResults) {
      clearResults()
    }

    setIsPannedAwayFromLocation(false)
    setMapCenter(userLocation)
    setCurrentZoom(INITIAL_ZOOM)
    setSearchDisplay('')
  }, [userLocation, hasResults, clearResults, setIsPannedAwayFromLocation, setMapCenter, setSearchDisplay, setCurrentZoom])

  return (
    <div className="flex flex-col w-full h-full">
      {/* Map Container - Always 100% height */}
      <div className="relative w-full h-full">
        {shouldRenderMap ? (
          <SearchMap
            center={mapCenter}
            pois={pois}
            selectedPoiId={selectedPoiId || undefined}
            userLocation={mapUserLocation}
            skipFitBounds={skipNextFitBounds || isInitialShowAllRef.current}
            includeUserLocationInFitBounds={includeUserLocationInViewport}
            desiredZoom={currentZoom}
            onMarkerClick={handleMarkerClick}
            onMapMove={handleMapMove}
            onMapBoundsChange={handleMapBoundsChange}
            onFitBoundsComplete={() => {
              setSkipNextFitBounds(false)
              // Don't reset isInitialShowAllRef here - let it reset after a delay
              // to prevent the effect from running twice
            }}
            onMapClick={handleMapClick}
            bottomOverlayHeight={resultsOverlayHeight}
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
                disabled={isSearching || isFetchingViewportPOIs}
                className="p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition disabled:opacity-50 flex-shrink-0"
                aria-label={hasMapMoved ? 'Search or filter this area' : 'Expand search or filters'}
                title={hasMapMoved ? 'Search or filter here' : 'Expand search or filters'}
              >
                {isSearching || isFetchingViewportPOIs ? (
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

        {/* Persistent Bottom Bar */}
        {shouldShowBottomBar && !isTypeaheadOpen && (
          <div ref={resultsOverlayRef} className="absolute bottom-0 left-0 right-0 z-10">
            {/* Collapsed Bar - Always visible */}
            <button
              type="button"
              onClick={() => setIsResultsExpanded(!isResultsExpanded)}
              className="w-full bg-white border-t-2 border-gray-200 px-4 py-3 flex items-center justify-between shadow-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {isLoadingInitialPOIs || isFetchingViewportPOIs ? (
                  <>
                    <IconLoader2 size={18} className="animate-spin text-primary-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {isLoadingInitialPOIs ? 'Loading places...' : 'Updating places...'}
                    </span>
                  </>
                ) : hasResults ? (
                  <span className="text-sm font-medium text-gray-900">
                    {pois.length} {pois.length === 1 ? 'place' : 'places'}
                    {pois.length >= 100 && <span className="text-xs font-normal text-amber-600 ml-1">(max)</span>}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-gray-500">
                    No places in this area
                  </span>
                )}
              </div>
              {!(isLoadingInitialPOIs || isFetchingViewportPOIs) && (
                isResultsExpanded ? (
                  <IconChevronDown size={20} className="text-gray-600" />
                ) : (
                  <IconChevronUp size={20} className="text-gray-600" />
                )
              )}
            </button>

            {/* Expanded Results Panel */}
            {isResultsExpanded && !isLoadingInitialPOIs && (
              <div
                className="bg-white border-t border-gray-200 overflow-y-auto animate-slide-up"
                style={{ maxHeight: '40vh' }}
              >
                {searchError && (
                  <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                    <p className="text-xs text-red-600">{searchError}</p>
                  </div>
                )}
                <div className="px-4 py-2">
                  {hasResults ? (
                    displayedPois.map((poi) => {
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
                    })
                  ) : (
                    <p className="text-sm text-gray-600">
                      No places match this area. Pan the map or adjust filters to see results.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
                placeholder="Search or filter places and categories"
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
              {combinedSuggestions.length === 0 && !hasMinimumQuery && (
                <div className="px-4 py-8 text-center text-sm text-gray-500 space-y-2">
                  <IconCategory size={32} className="mx-auto text-gray-300" />
                  <p>Start typing to search for places or explore popular categories below.</p>
                </div>
              )}

              {combinedSuggestions.length === 0 && hasMinimumQuery && !isFetchingSuggestions && (
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
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</h3>
                  </div>
                  {categorySuggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
                </div>
              )}

              {/* Places Section */}
              {filteredPlaceSuggestions.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search Results</h3>
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
