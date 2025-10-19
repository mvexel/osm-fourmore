import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconSearch,
  IconX,
  IconLoader2,
  IconChevronRight,
  IconCategory,
  IconMapSearch,
} from '@tabler/icons-react'
import { SearchMap } from '../components/SearchMap'
import { placesApi } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'
import type { POI, SearchRequest } from '../types'
import { CATEGORY_META, type CategoryKey } from '../generated/category_metadata'
import { POICard } from '../components/POICard'
import { BusinessDetailsCard } from '../components/BusinessDetailsCard'
import { useNavigate } from 'react-router-dom'

const DEFAULT_CENTER = { lat: 40.7128, lon: -74.006 } // New York City fallback
const DEFAULT_RADIUS = 1000
const MIN_QUERY_LENGTH = 2
const BOTTOM_SAFE_OFFSET_PX = 88
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

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [pois, setPois] = useState<POI[]>([])
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const [isTypeaheadOpen, setIsTypeaheadOpen] = useState(false)
  const [searchDisplay, setSearchDisplay] = useState('Search nearby')
  const [searchQuery, setSearchQuery] = useState('')
  const [placeSuggestions, setPlaceSuggestions] = useState<POI[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [sheetBounds, setSheetBounds] = useState({ min: 80, max: 480 })
  const [sheetHeight, setSheetHeight] = useState(80)
  const [hasCenteredOnLocation, setHasCenteredOnLocation] = useState(false)

  // Keep a slightly taller collapsed height so results are visible when the drawer previews.
  const resultsPreviewHeight = useMemo(
    () => Math.min(sheetBounds.min + 140, sheetBounds.max),
    [sheetBounds.min, sheetBounds.max]
  )

  const inputRef = useRef<HTMLInputElement>(null)

  const clampSheetHeight = useCallback(
    (value: number) => Math.min(Math.max(value, sheetBounds.min), sheetBounds.max),
    [sheetBounds]
  )

  useEffect(() => {
    const updateBounds = () => {
      if (typeof window === 'undefined') return
      const min = 80
      const max = Math.min(Math.max(window.innerHeight * 0.6, min + 160), window.innerHeight - 140)
      setSheetBounds((prev) => {
        if (prev.min === min && prev.max === max) {
          return prev
        }
        return { min, max }
      })
    }

    updateBounds()
    window.addEventListener('resize', updateBounds)
    return () => window.removeEventListener('resize', updateBounds)
  }, [])

  useEffect(() => {
    setSheetHeight((height) => clampSheetHeight(height))
  }, [clampSheetHeight])

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      const centered = { lat: latitude, lon: longitude }
      setMapCenter(centered)
      setHasCenteredOnLocation(true)
    }
  }, [latitude, longitude])

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
          radius: DEFAULT_RADIUS,
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

    setSelectedPoiId((prev) => {
      if (!prev) {
        return prev
      }
      return pois.some((poi) => `${poi.osm_type}-${poi.osm_id}` === prev) ? prev : null
    })

    if (!isTypeaheadOpen) {
      const defaultHeight = pois.length > 1 ? resultsPreviewHeight : sheetBounds.max
      setSheetHeight(defaultHeight)
    }
  }, [pois, sheetBounds.max, isTypeaheadOpen, resultsPreviewHeight])

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
      setSheetHeight(sheetBounds.max)
      closeTypeahead()
    },
    [closeTypeahead, sheetBounds.max]
  )

  const selectCategorySuggestion = useCallback(
    async (className: CategoryKey, label: string) => {
      if (latitude === null || longitude === null) {
        setModalError('Enable location services to search nearby categories.')
        return
      }

      closeTypeahead()
      setSearchDisplay(label)
      setIsLoadingResults(true)
      setSearchError(null)
      setSelectedPoiId(null)

      try {
        const results = await placesApi.getNearby({
          lat: latitude,
          lon: longitude,
          radius: DEFAULT_RADIUS,
          class: className,
          limit: 20,
          offset: 0,
        })
        setPois(results)
        if (results.length > 0) {
          setMapCenter({ lat: results[0].lat, lon: results[0].lon })
          setSearchError(null)
          setSheetHeight(resultsPreviewHeight)
        } else {
          setSearchError(`No ${label.toLowerCase()} found nearby.`)
        }
      } catch (error) {
        console.error('Failed to load category results', error)
        setSearchError('Something went wrong while loading results.')
      } finally {
        setIsLoadingResults(false)
      }
    },
    [latitude, longitude, closeTypeahead, resultsPreviewHeight]
  )

  const handleMarkerClick = useCallback((poi: POI) => {
    setSelectedPoiId(`${poi.osm_type}-${poi.osm_id}`)
    setMapCenter({ lat: poi.lat, lon: poi.lon })
    setSheetHeight(sheetBounds.max)
  }, [sheetBounds.max])

  const handleCardClick = useCallback(
    (poi: POI) => {
      setSelectedPoiId(`${poi.osm_type}-${poi.osm_id}`)
      setMapCenter({ lat: poi.lat, lon: poi.lon })
      setSheetHeight(sheetBounds.max)
    },
    [sheetBounds.max]
  )

  const handleSheetPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const startY = event.clientY
      const startHeight = sheetHeight

      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta = startY - moveEvent.clientY
        setSheetHeight(clampSheetHeight(startHeight + delta))
      }

      const onPointerUp = () => {
        const midpoint = (sheetBounds.min + sheetBounds.max) / 2
        setSheetHeight((current) =>
          current > midpoint ? sheetBounds.max : sheetBounds.min
        )
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [sheetBounds, sheetHeight, clampSheetHeight]
  )

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
  const isExpanded = sheetHeight > sheetBounds.min + 40
  const highlightTerm = trimmedQuery.length >= MIN_QUERY_LENGTH ? trimmedQuery : undefined

  return (
    <div
      className="relative w-full"
      style={{ height: `calc(100vh - ${BOTTOM_SAFE_OFFSET_PX + 56}px)` }}
    >
      {shouldRenderMap ? (
        <SearchMap
          center={mapCenter}
          pois={pois}
          selectedPoiId={selectedPoiId || undefined}
          userLocation={userLocation}
          onMarkerClick={handleMarkerClick}
          bottomInset={sheetHeight}
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
                We’ll show the map once we know where you are. You can still search by name while we wait.
              </p>
            </>
          )}
        </div>
      )}

      {/* Search bar overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full px-4 max-w-xl">
        <button
          type="button"
          onClick={openTypeahead}
          className="w-full flex items-center space-x-2 bg-white border border-gray-200 rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition"
        >
          <IconSearch size={18} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700 truncate">{searchDisplay}</span>
        </button>
        {locationError && (
          <p className="mt-2 text-xs text-red-600 bg-white/90 rounded-md px-3 py-2 border border-red-200">
            {locationError}{' '}
            <button type="button" className="underline" onClick={retry}>
              Try again
            </button>
          </p>
        )}
      </div>

      {/* Results drawer */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-10"
        style={{ bottom: 0 }}
      >
        <div
          className="pointer-events-auto bg-white/95 backdrop-blur rounded-t-3xl border-t border-gray-200 flex flex-col transition-[height] duration-200"
          style={{ height: `${sheetHeight}px` }}
        >
          <div className="pt-3 pb-2">
            <div
              className="mx-auto w-12 h-1.5 bg-gray-300 rounded-full"
              onPointerDown={handleSheetPointerDown}
              style={{ touchAction: 'none', cursor: 'grab' }}
            />
          </div>

          <div className="px-4 pb-2 space-y-2 overflow-hidden" style={{ maxHeight: `${sheetHeight - 30}px` }}>
            {pois.length === 0 ? (
              <div className="flex items-center justify-center py-2">
                <p className="text-xs text-gray-400">
                  {isLoadingResults ? 'Searching...' : 'Search to see nearby places'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Results</span>
                  <div className="flex items-center space-x-2">
                    <span>{pois.length}</span>
                  </div>
                </div>

                {searchError && <p className="text-sm text-gray-600">{searchError}</p>}

                {pois.length > 1 && !isExpanded && !searchError && (
                  <p className="text-xs text-gray-400">
                    Swipe up for more options.
                  </p>
                )}
              </>
            )}
          </div>

          <div
            className={`px-4 overflow-y-auto flex-1 transition-all duration-200 ${isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none h-0'
              }`}
          >
            {pois.map((poi) => {
              const poiKey = `${poi.osm_type}-${poi.osm_id}`
              const isActiveCard = selectedPoiId === poiKey
              const showExpandedDetails = isExpanded && isActiveCard
              const hasInlineDetails = Boolean(
                poi.address || poi.phone || poi.website || poi.opening_hours
              )
              return (
                <div key={poiKey} className="mb-2 last:mb-0">
                  <POICard
                    poi={poi}
                    onClick={() => handleCardClick(poi)}
                    highlight={highlightTerm}
                    isActive={isActiveCard}
                    isExpanded={showExpandedDetails}
                  >
                    {hasInlineDetails && <BusinessDetailsCard poi={poi} variant="embedded" />}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/places/${poi.osm_type}/${poi.osm_id}`)
                      }}
                      className={`${hasInlineDetails ? 'mt-3 ' : ''}w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    >
                      Open full details
                    </button>
                  </POICard>
                </div>
              )
            })}
          </div>
        </div>
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
