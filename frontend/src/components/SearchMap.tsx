import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Marker, AttributionControl } from 'react-map-gl/maplibre'
import type {
  MapRef,
  LngLatBoundsLike,
  StyleSpecification,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LngLatBounds } from 'maplibre-gl'
import type { Map as MapInstance } from 'maplibre-gl'
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
  const pendingCompletionRef = useRef<(() => void) | null>(null)
  const lastBoundsSignatureRef = useRef<string>('')
  const lastEmptyCenterRef = useRef<{ lat: number; lon: number; zoom?: number } | null>(null)
  const lastSelectionSignatureRef = useRef<string | null>(null)

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

  const markProgrammaticMove = useCallback(
    (
      action: (mapInstance: MapInstance) => void,
      options: { onComplete?: () => void } = {}
    ) => {
      const map = mapRef.current?.getMap()
      if (!map) {
        return
      }

      isProgrammaticMoveRef.current = true
      pendingCompletionRef.current = options.onComplete ?? null

      try {
        action(map)
      } catch (error) {
        isProgrammaticMoveRef.current = false
        pendingCompletionRef.current = null
        throw error
      }
    },
    []
  )

  // Handle center changes when there are no POIs (e.g., recenter button)
  useEffect(() => {
    if (!isMapReady) {
      return
    }

    if (pois.length > 0) {
      lastEmptyCenterRef.current = null
      return
    }

    const prev = lastEmptyCenterRef.current
    const centerChanged =
      !prev ||
      Math.abs(prev.lat - center.lat) >= 0.00001 ||
      Math.abs(prev.lon - center.lon) >= 0.00001 ||
      prev.zoom !== desiredZoom

    if (!centerChanged) {
      return
    }

    lastEmptyCenterRef.current = { lat: center.lat, lon: center.lon, zoom: desiredZoom }

    markProgrammaticMove((map) => {
      const targetZoom = desiredZoom !== undefined ? desiredZoom : map.getZoom()
      map.easeTo({
        center: [center.lon, center.lat],
        zoom: targetZoom,
        duration: 500,
      })
    })
  }, [center.lat, center.lon, desiredZoom, isMapReady, markProgrammaticMove, pois.length])

  const formatCoordinate = useCallback((value: number | undefined) => {
    if (value === undefined) {
      return 'na'
    }
    return value.toFixed(6)
  }, [])

  const selectedPoi = useMemo(() => {
    if (!selectedPoiId) {
      return null
    }
    return pois.find((poi) => `${poi.osm_type}-${poi.osm_id}` === selectedPoiId) ?? null
  }, [pois, selectedPoiId])

  useEffect(() => {
    if (!isMapReady || !selectedPoiId || !selectedPoi) {
      if (!selectedPoiId || !selectedPoi) {
        lastSelectionSignatureRef.current = null
      }
      return
    }

    const selectionSignature = `${selectedPoiId}:${selectedPoi.lat.toFixed(6)}:${selectedPoi.lon.toFixed(6)}`
    if (lastSelectionSignatureRef.current === selectionSignature) {
      return
    }
    lastSelectionSignatureRef.current = selectionSignature

    markProgrammaticMove((map) => {
      const currentZoom = map.getZoom()
      map.easeTo({
        center: [selectedPoi.lon, selectedPoi.lat],
        zoom: Math.max(currentZoom, 15),
        duration: 500,
      })
    })
  }, [isMapReady, markProgrammaticMove, selectedPoi, selectedPoiId])

  useEffect(() => {
    if (pois.length === 0) {
      lastBoundsSignatureRef.current = ''
    }
  }, [pois.length])

  useEffect(() => {
    if (!isMapReady) {
      return
    }

    if (selectedPoiId) {
      return
    }

    if (pois.length === 0) {
      return
    }

    const poiSignature = pois
      .map((poi) => `${poi.osm_type}:${poi.osm_id}:${formatCoordinate(poi.lat)}:${formatCoordinate(poi.lon)}`)
      .join('|') || 'none'
    const userSignature = userLocation
      ? `${formatCoordinate(userLocation.lat)}:${formatCoordinate(userLocation.lon)}`
      : 'none'
    const radiusSignature = searchRadius !== undefined ? String(searchRadius) : 'none'
    const includeSignature = includeUserLocationInFitBounds ? '1' : '0'
    const skipSignature = skipFitBounds ? '1' : '0'
    const combinedSignature = [poiSignature, userSignature, radiusSignature, includeSignature, skipSignature].join(';')

    if (combinedSignature === lastBoundsSignatureRef.current) {
      return
    }

    lastBoundsSignatureRef.current = combinedSignature

    if (skipFitBounds) {
      onFitBoundsComplete?.()
      return
    }

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

      if (includeUserLocationInFitBounds && userLocation) {
        bounds.extend([userLocation.lon, userLocation.lat])
      }
    }

    markProgrammaticMove(
      (map) => {
        map.fitBounds(bounds as LngLatBoundsLike, {
          padding: { top: 120, bottom: 80, left: 50, right: 50 },
          maxZoom: 16,
          duration: 700,
        })
      },
      { onComplete: onFitBoundsComplete }
    )
  }, [
    formatCoordinate,
    includeUserLocationInFitBounds,
    isMapReady,
    markProgrammaticMove,
    onFitBoundsComplete,
    pois,
    searchRadius,
    selectedPoiId,
    skipFitBounds,
    userLocation,
  ])

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
      pendingCompletionRef.current?.()
      pendingCompletionRef.current = null
      isProgrammaticMoveRef.current = false
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
