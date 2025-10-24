import { useCallback, useState } from 'react'
import { placesApi } from '../services/api'
import type { POI } from '../types'
import type { CategoryKey } from '../generated/category_metadata'
import { calculateBboxFromZoom } from '../utils/mapUtils'

const INITIAL_SEARCH_ZOOM = 17
const MIN_SEARCH_ZOOM = 12

interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

interface UseCategorySearchArgs {
  mapCenter: { lat: number; lon: number }
  mapBounds: MapBounds | null
  currentZoom: number
  lastSearchCategory: CategoryKey | null
  lastSearchCenter: { lat: number; lon: number } | null
  setSearchError: (message: string | null) => void
  setSkipNextFitBounds: (value: boolean) => void
  resetMapMovement: () => void
  actions: {
    setPois: (pois: POI[]) => void
    setMapCenter: (center: { lat: number; lon: number }) => void
    setCurrentZoom: (zoom: number) => void
    setIncludeUserLocationInViewport: (include: boolean) => void
    setLastSearchCategory: (category: CategoryKey | null) => void
    setLastSearchCenter: (center: { lat: number; lon: number } | null) => void
  }
  userLocation: { lat: number; lon: number } | null
}

interface SearchCategoryParams {
  className: CategoryKey
  label: string
}

interface ContinueSearchParams {
  hasMapMoved: boolean
}

export function useCategorySearch({
  mapCenter,
  mapBounds,
  currentZoom,
  lastSearchCategory,
  lastSearchCenter,
  setSearchError,
  setSkipNextFitBounds,
  resetMapMovement,
  actions,
  userLocation,
}: UseCategorySearchArgs) {
  const [isSearching, setIsSearching] = useState(false)
  const progressiveCategorySearch = useCallback(
    async (className: CategoryKey, centerLat: number, centerLon: number, startingZoom?: number) => {
      let zoomLevel = startingZoom ?? INITIAL_SEARCH_ZOOM

      while (zoomLevel >= MIN_SEARCH_ZOOM) {
        const bbox = calculateBboxFromZoom(centerLat, centerLon, zoomLevel)

        try {
          const results = await placesApi.getBbox({
            ...bbox,
            class: className,
            limit: 100,
          })

          if (results.length > 0) {
            return { results, zoom: zoomLevel }
          }
        } catch (error) {
          console.error(`Bbox search failed at zoom ${zoomLevel}`, error)
          throw error
        }

        zoomLevel -= 1
      }

      return { results: [], zoom: MIN_SEARCH_ZOOM }
    },
    []
  )

  const searchCategory = useCallback(
    async ({ className, label }: SearchCategoryParams) => {
      if (!userLocation) {
        setSearchError('Enable location services to search nearby categories.')
        return
      }

      setIsSearching(true)
      setSearchError(null)
      resetMapMovement()

      actions.setLastSearchCategory(className)
      actions.setLastSearchCenter({ lat: mapCenter.lat, lon: mapCenter.lon })
      actions.setIncludeUserLocationInViewport(false)
      setSkipNextFitBounds(true)

      try {
        const { results, zoom } = await progressiveCategorySearch(
          className,
          mapCenter.lat,
          mapCenter.lon,
          currentZoom
        )

        actions.setPois(results)
        actions.setCurrentZoom(zoom)

        if (results.length > 0) {
          actions.setMapCenter({ lat: mapCenter.lat, lon: mapCenter.lon })
          setSearchError(null)
        } else {
          setSearchError(`No ${label.toLowerCase()} found nearby.`)
        }
      } catch (error) {
        console.error('Failed to load category results', error)
        setSearchError('Something went wrong while loading results.')
      } finally {
        setIsSearching(false)
        setTimeout(() => {
          setSkipNextFitBounds(false)
        }, 0)
      }
    },
    [
      actions,
      currentZoom,
      mapCenter.lat,
      mapCenter.lon,
      progressiveCategorySearch,
      resetMapMovement,
      setSkipNextFitBounds,
      setSearchError,
      userLocation,
    ]
  )

  const continueSearch = useCallback(
    async ({ hasMapMoved }: ContinueSearchParams) => {
      if (!lastSearchCategory || !lastSearchCenter) {
        return
      }

      setIsSearching(true)
      setSearchError(null)
      const includeUserLocation = false

      try {
        if (hasMapMoved && mapBounds) {
          const results = await placesApi.getBbox({
            ...mapBounds,
            class: lastSearchCategory,
            limit: 100,
          })

          const centerFromBounds = {
            lat: (mapBounds.north + mapBounds.south) / 2,
            lon: (mapBounds.east + mapBounds.west) / 2,
          }

          setSkipNextFitBounds(true)
          actions.setPois(results)
          actions.setLastSearchCenter(centerFromBounds)
          actions.setMapCenter(centerFromBounds)
          actions.setIncludeUserLocationInViewport(includeUserLocation)
          resetMapMovement()

          if (results.length === 0) {
            setSearchError('No results found in this area.')
          }
          return
        }

        const nextZoom = Math.max(currentZoom - 1, MIN_SEARCH_ZOOM)
        if (nextZoom === currentZoom) {
          setSearchError('Already showing maximum search area.')
          return
        }

        const bbox = calculateBboxFromZoom(
          lastSearchCenter.lat,
          lastSearchCenter.lon,
          nextZoom
        )

        const results = await placesApi.getBbox({
          ...bbox,
          class: lastSearchCategory,
          limit: 100,
        })

        actions.setPois(results)
        actions.setCurrentZoom(nextZoom)
        actions.setIncludeUserLocationInViewport(includeUserLocation)

        if (results.length === 0) {
          setSearchError('No additional results found.')
        }
      } catch (error) {
        console.error('Failed to continue search', error)
        setSearchError('Something went wrong while searching.')
      } finally {
        setIsSearching(false)
        setTimeout(() => {
          setSkipNextFitBounds(false)
        }, 0)
      }
    },
    [
      actions,
      currentZoom,
      lastSearchCategory,
      lastSearchCenter,
      mapBounds,
      resetMapMovement,
      setSearchError,
      setSkipNextFitBounds,
    ]
  )

  return {
    searchCategory,
    continueSearch,
    isSearching,
  }
}
