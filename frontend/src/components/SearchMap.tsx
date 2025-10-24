import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
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
  onMapMove?: (view: { lat: number; lon: number; zoom: number }) => void
  onMapBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  onFitBoundsComplete?: () => void
  onMapClick?: () => void
  bottomOverlayHeight?: number
}

const DEFAULT_VIEW = {
  latitude: 40.7128,
  longitude: -74.006,
  zoom: 16,
}

const MAP_PADDING = {
  top: 80,
  bottom: 40,
  left: 20,
  right: 20,
} as const


function useProgrammaticMove(mapRef: MutableRefObject<MapRef | null>) {
  const isProgrammaticMoveRef = useRef(false)
  const completionRef = useRef<(() => void) | null>(null)

  const run = useCallback((action: (mapInstance: MapInstance) => void, options: { onComplete?: () => void } = {}) => {
    const map = mapRef.current?.getMap()
    if (!map) {
      return
    }

    isProgrammaticMoveRef.current = true
    completionRef.current = options.onComplete ?? null

    try {
      action(map)
    } catch (error) {
      isProgrammaticMoveRef.current = false
      completionRef.current = null
      throw error
    }
  }, [mapRef])

  const consume = useCallback(() => {
    if (!isProgrammaticMoveRef.current) {
      return false
    }

    completionRef.current?.()
    completionRef.current = null
    isProgrammaticMoveRef.current = false
    return true
  }, [])

  return { run, consume }
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
  onMapClick,
  bottomOverlayHeight = 0,
}: SearchMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const { run: withProgrammaticMove, consume: consumeProgrammaticMove } = useProgrammaticMove(mapRef)
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

  // Handle center changes when there are no POIs (e.g., recenter button)
  useEffect(() => {
    if (!isMapReady) {
      return
    }

    if (pois.length > 0) {
      lastEmptyCenterRef.current = null
      return
    }

    const previous = lastEmptyCenterRef.current
    const centerChanged =
      !previous ||
      Math.abs(previous.lat - center.lat) >= 0.00001 ||
      Math.abs(previous.lon - center.lon) >= 0.00001 ||
      previous.zoom !== desiredZoom

    if (!centerChanged) {
      return
    }

    lastEmptyCenterRef.current = { lat: center.lat, lon: center.lon, zoom: desiredZoom }

    withProgrammaticMove((map) => {
      const targetZoom = desiredZoom ?? map.getZoom()
      map.easeTo({
        center: [center.lon, center.lat],
        zoom: targetZoom,
        duration: 500,
      })
    })
  }, [center.lat, center.lon, desiredZoom, isMapReady, pois.length, withProgrammaticMove])

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

    const overlayKey = bottomOverlayHeight.toFixed(3)
    const signature = `${selectedPoiId}:${selectedPoi.lat.toFixed(6)}:${selectedPoi.lon.toFixed(6)}:${overlayKey}`
    if (lastSelectionSignatureRef.current === signature) {
      return
    }
    lastSelectionSignatureRef.current = signature

    withProgrammaticMove((map) => {
      const currentZoom = map.getZoom()
      // Negative offset moves the visual center up, effectively panning the map down
      // to keep the POI visible above the drawer. We offset by half the drawer height
      // to center the POI in the visible area above the drawer.
      const bottomOffset = bottomOverlayHeight > 0 ? -bottomOverlayHeight / 2 : 0
      const cameraOptions: Parameters<MapInstance['easeTo']>[0] = {
        center: [selectedPoi.lon, selectedPoi.lat],
        zoom: Math.max(currentZoom, 15),
        duration: 500,
      }

      if (bottomOffset !== 0) {
        cameraOptions.offset = [0, bottomOffset]
      }

      map.easeTo(cameraOptions)
    })
  }, [bottomOverlayHeight, isMapReady, selectedPoi, selectedPoiId, withProgrammaticMove])

  useEffect(() => {
    if (pois.length === 0) {
      lastBoundsSignatureRef.current = ''
    }
  }, [pois.length])

  useEffect(() => {
    if (!isMapReady || selectedPoiId || pois.length === 0) {
      return
    }

    const snapshot = JSON.stringify({
      pois: pois.map((poi) => ({
        id: `${poi.osm_type}-${poi.osm_id}`,
        lat: Number(poi.lat.toFixed(6)),
        lon: Number(poi.lon.toFixed(6)),
      })),
      user: userLocation
        ? {
          lat: Number(userLocation.lat.toFixed(6)),
          lon: Number(userLocation.lon.toFixed(6)),
        }
        : null,
      radius: searchRadius ?? null,
      includeUserLocationInFitBounds,
    })

    if (snapshot === lastBoundsSignatureRef.current) {
      return
    }

    lastBoundsSignatureRef.current = snapshot

    if (skipFitBounds) {
      return
    }

    const bounds = new LngLatBounds()

    if (searchRadius && userLocation) {
      const latOffset = (searchRadius / 1000) / 111
      const lonOffset = (searchRadius / 1000) / (111 * Math.cos(userLocation.lat * Math.PI / 180))

      bounds.extend([userLocation.lon - lonOffset, userLocation.lat - latOffset])
      bounds.extend([userLocation.lon + lonOffset, userLocation.lat + latOffset])
    } else {
      pois.forEach((poi) => {
        bounds.extend([poi.lon, poi.lat])
      })

      if (includeUserLocationInFitBounds && userLocation) {
        bounds.extend([userLocation.lon, userLocation.lat])
      }
    }

    const fitBoundsPadding = {
      top: 120,
      bottom: Math.max(80, bottomOverlayHeight),
      left: 50,
      right: 50,
    }

    withProgrammaticMove(
      (map) => {
        map.fitBounds(bounds as LngLatBoundsLike, {
          padding: fitBoundsPadding,
          maxZoom: 16,
          duration: 700,
        })
      },
      { onComplete: onFitBoundsComplete }
    )
  }, [
    includeUserLocationInFitBounds,
    isMapReady,
    bottomOverlayHeight,
    onFitBoundsComplete,
    pois,
    searchRadius,
    selectedPoiId,
    skipFitBounds,
    userLocation,
    withProgrammaticMove,
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
    if (consumeProgrammaticMove()) {
      return
    }

    if (onMapMove) {
      const center = map.getCenter()
      onMapMove({ lat: center.lat, lon: center.lng, zoom: map.getZoom() })
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
      onClick={() => onMapClick?.()}
      padding={MAP_PADDING}
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
