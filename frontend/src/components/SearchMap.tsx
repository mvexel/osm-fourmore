import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Marker, AttributionControl } from 'react-map-gl/maplibre'
import type {
  MapRef,
  LngLatBoundsLike,
  MapLayerMouseEvent,
  ViewState,
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
  onMarkerClick?: (poi: POI) => void
}

const DEFAULT_VIEW = {
  latitude: 40.7128,
  longitude: -74.006,
  zoom: 12,
}

export function SearchMap({
  center,
  pois,
  selectedPoiId,
  userLocation,
  onMarkerClick,
}: SearchMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  const viewState = useMemo<ViewState>(() => {
    if (center) {
      return {
        latitude: center.lat,
        longitude: center.lon,
        zoom: DEFAULT_VIEW.zoom,
      }
    }
    return DEFAULT_VIEW
  }, [center])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !isMapReady) {
      return
    }

    const hasResults = pois.length > 0
    const hasUserLocation = Boolean(userLocation)

    if (!hasResults) {
      map.easeTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        duration: 500,
      })
      return
    }

    const bounds = new LngLatBounds()
    pois.forEach((poi) => {
      bounds.extend([poi.lon, poi.lat])
    })

    if (hasUserLocation && userLocation) {
      bounds.extend([userLocation.lon, userLocation.lat])
    }

    map.fitBounds(bounds as LngLatBoundsLike, {
      padding: 80,
      maxZoom: 16,
      duration: 700,
    })
  }, [pois, userLocation, isMapReady, viewState.latitude, viewState.longitude, viewState.zoom])

  const handleMapLoad = () => {
    setIsMapReady(true)
  }

  const handleMarkerClick = (event: MapLayerMouseEvent, poi: POI) => {
    event.originalEvent.stopPropagation()
    onMarkerClick?.(poi)
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
            anchor="bottom"
            onClick={(event) => handleMarkerClick(event, poi)}
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
