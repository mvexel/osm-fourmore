import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Marker, AttributionControl } from 'react-map-gl/maplibre'
import type {
  MapRef,
  LngLatBoundsLike,
  StyleSpecification,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LngLatBounds } from 'maplibre-gl'
import type { POI } from '../types'
import mapStyle from '../styles/osm-bright-osmusa.json'
import { getCategoryIcon } from '../utils/icons'

interface SearchMapProps {
  center: { lat: number; lon: number }
  pois: POI[]
  selectedPoiId?: string
  userLocation?: { lat: number; lon: number } | null
  searchRadius?: number // in meters
  skipFitBounds?: boolean
  includeUserLocationInFitBounds?: boolean
  desiredZoom?: number // Optional zoom level for recenter operations
  onMarkerClick?: (poi: POI) => void
  onMapMove?: (center: { lat: number; lon: number }) => void
  onMapBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  onFitBoundsComplete?: () => void
}

const DEFAULT_VIEW = {
  latitude: 40.7128,
  longitude: -74.006,
  zoom: 17,
}

export function SearchMap({
  center,
  pois,
  selectedPoiId,
  userLocation,
  searchRadius,
  skipFitBounds,
  includeUserLocationInFitBounds = true,
  desiredZoom,
  onMarkerClick,
  onMapMove,
  onMapBoundsChange,
  onFitBoundsComplete,
}: SearchMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const isProgrammaticMoveRef = useRef(false)
  const programmaticMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousPoisRef = useRef<POI[]>([])
  const previousSelectedPoiIdRef = useRef<string | undefined>(undefined)

  const viewState = useMemo(() => {
    if (center) {
      return {
        latitude: center.lat,
        longitude: center.lon,
        zoom: DEFAULT_VIEW.zoom,
      }
    }
    return DEFAULT_VIEW
  }, [center])

  // Track previous center to detect actual center changes
  const previousCenterRef = useRef<{ lat: number; lon: number } | null>(null)

  // Handle center changes when there are no POIs (e.g., recenter button)
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !isMapReady || pois.length > 0) {
      return
    }

    // Check if center actually changed (not just zoom)
    const prev = previousCenterRef.current
    if (prev && Math.abs(prev.lat - center.lat) < 0.00001 && Math.abs(prev.lon - center.lon) < 0.00001) {
      return // Center hasn't changed meaningfully
    }

    previousCenterRef.current = { lat: center.lat, lon: center.lon }

    // Animate to new center when it changes and there are no POIs
    isProgrammaticMoveRef.current = true
    const targetZoom = desiredZoom !== undefined ? desiredZoom : map.getZoom()
    map.easeTo({
      center: [center.lon, center.lat],
      zoom: targetZoom,
      duration: 500,
    })

    const timeout = setTimeout(() => {
      isProgrammaticMoveRef.current = false
    }, 600)

    return () => clearTimeout(timeout)
  }, [center.lat, center.lon, pois.length, isMapReady, desiredZoom])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !isMapReady) {
      return
    }

    // Check if POIs or selectedPoiId actually changed
    const poisChanged = JSON.stringify(previousPoisRef.current) !== JSON.stringify(pois)
    const selectedPoiChanged = previousSelectedPoiIdRef.current !== selectedPoiId

    if (!poisChanged && !selectedPoiChanged) {
      return // Nothing changed, don't move the map
    }

    // Skip fitBounds if requested (e.g., bbox search should maintain viewport)
    if (skipFitBounds && poisChanged && !selectedPoiChanged) {
      previousPoisRef.current = pois
      onFitBoundsComplete?.()
      return
    }

    // Update refs
    previousPoisRef.current = pois
    previousSelectedPoiIdRef.current = selectedPoiId

    // Clear any existing timeout
    if (programmaticMoveTimeoutRef.current) {
      clearTimeout(programmaticMoveTimeoutRef.current)
    }

    if (selectedPoiId) {
      // Mark as programmatic move before executing
      isProgrammaticMoveRef.current = true
      const currentZoom = map.getZoom()
      map.easeTo({
        center: [center.lon, center.lat],
        zoom: Math.max(currentZoom, 15),
        duration: 500,
      })
      // Reset flag after animation completes (with buffer)
      programmaticMoveTimeoutRef.current = setTimeout(() => {
        isProgrammaticMoveRef.current = false
      }, 600)
      return
    }

    const hasResults = pois.length > 0
    const hasUserLocation = Boolean(userLocation)

    if (!hasResults) {
      // Mark as programmatic move before executing
      isProgrammaticMoveRef.current = true
      const currentZoom = map.getZoom()
      map.easeTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: currentZoom, // Keep current zoom instead of resetting
        duration: 500,
      })
      // Reset flag after animation completes (with buffer)
      programmaticMoveTimeoutRef.current = setTimeout(() => {
        isProgrammaticMoveRef.current = false
      }, 600)
      return
    }

    // Mark as programmatic move before executing fitBounds
    isProgrammaticMoveRef.current = true

    const bounds = new LngLatBounds()

    if (searchRadius && userLocation) {
      // Use search radius to create bounds for a circular area
      // Approximate: 1 degree latitude ≈ 111km, longitude varies by latitude
      const latOffset = (searchRadius / 1000) / 111 // convert meters to degrees
      const lonOffset = (searchRadius / 1000) / (111 * Math.cos(userLocation.lat * Math.PI / 180))

      bounds.extend([userLocation.lon - lonOffset, userLocation.lat - latOffset])
      bounds.extend([userLocation.lon + lonOffset, userLocation.lat + latOffset])
    } else {
      // Fallback to fitting all POIs
      pois.forEach((poi) => {
        bounds.extend([poi.lon, poi.lat])
      })

      if (includeUserLocationInFitBounds && hasUserLocation && userLocation) {
        bounds.extend([userLocation.lon, userLocation.lat])
      }
    }

    map.fitBounds(bounds as LngLatBoundsLike, {
      padding: { top: 120, bottom: 80, left: 50, right: 50 },
      maxZoom: 16,
      duration: 700,
    })

    // Reset flag after animation completes (with buffer)
    programmaticMoveTimeoutRef.current = setTimeout(() => {
      isProgrammaticMoveRef.current = false
    }, 800)
  }, [
    pois,
    userLocation,
    isMapReady,
    selectedPoiId,
    center,
    viewState,
    skipFitBounds,
    onFitBoundsComplete,
    searchRadius,
    includeUserLocationInFitBounds,
  ])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (programmaticMoveTimeoutRef.current) {
        clearTimeout(programmaticMoveTimeoutRef.current)
      }
    }
  }, [])

  const handleMapLoad = () => {
    setIsMapReady(true)
  }

  const handleMoveEnd = () => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // Update bounds (for both user and programmatic moves)
    if (onMapBoundsChange) {
      const bounds = map.getBounds()
      onMapBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }

    // Only trigger onMapMove for user-initiated moves, not programmatic ones
    if (isProgrammaticMoveRef.current) {
      // Don't reset the flag here - let the timeout handle it
      return
    }

    if (onMapMove) {
      const center = map.getCenter()
      onMapMove({ lat: center.lat, lon: center.lng })
    }
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: viewState.longitude,
        latitude: viewState.latitude,
        zoom: viewState.zoom,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle as StyleSpecification}
      attributionControl={false}
      onLoad={handleMapLoad}
      onMoveEnd={handleMoveEnd}
      padding={{ top: 80, bottom: 40, left: 20, right: 20 }}
    >
      {userLocation && (
        <Marker longitude={userLocation.lon} latitude={userLocation.lat} anchor="center">
          <div className="relative">
            <div className="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75" />
            <div className="relative w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
          </div>
        </Marker>
      )}

      {pois.map((poi) => {
        const icon = getCategoryIcon(poi.class || poi.category || 'misc', { size: 18 })
        const markerKey = `${poi.osm_type}-${poi.osm_id}`
        const isSelected = selectedPoiId === markerKey
        return (
          <Marker
            key={markerKey}
            longitude={poi.lon}
            latitude={poi.lat}
            anchor="center"
            onClick={(event) => {
              event.originalEvent.stopPropagation()
              onMarkerClick?.(poi)
            }}
          >
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full shadow-lg border ${isSelected ? 'bg-primary-600 border-white' : 'bg-white border-gray-200'
                }`}
            >
              <div className={isSelected ? 'text-white' : 'text-primary-700'}>{icon}</div>
            </div>
          </Marker>
        )
      })}

      <AttributionControl compact={true} position="bottom-right" />
    </Map>
  )
}
