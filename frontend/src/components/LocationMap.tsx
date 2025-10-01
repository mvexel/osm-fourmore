import Map, { Marker, AttributionControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useState, useEffect, useRef } from 'react'
import type { MapRef, StyleSpecification } from 'react-map-gl/maplibre'
import { LngLatBounds } from 'maplibre-gl'
import mapStyle from '../styles/osm-bright-osmusa.json'

interface LocationMapProps {
  lat: number
  lon: number
  name?: string
  zoom?: number
  height?: string
  showMarker?: boolean
  showUserLocation?: boolean
}

export function LocationMap({
  lat,
  lon,
  name,
  zoom = 16,
  height = '300px',
  showMarker = true,
  showUserLocation = false,
}: LocationMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lon: number
  } | null>(null)

  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
        },
        (error) => {
          console.warn('Error getting user location:', error)
        }
      )
    }
  }, [showUserLocation])

  useEffect(() => {
    if (showUserLocation && userLocation && mapRef.current) {
      const map = mapRef.current.getMap()
      const bounds = new LngLatBounds()
      bounds.extend([lon, lat])
      bounds.extend([userLocation.lon, userLocation.lat])
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 })
    }
  }, [showUserLocation, userLocation, lat, lon])

  return (
    <div className="w-full">
      <div
        className="relative w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm"
        style={{ height }}
      >
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: lon,
            latitude: lat,
            zoom,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle as StyleSpecification}
          attributionControl={false}
        >
          {showMarker && (
            <Marker
              longitude={lon}
              latitude={lat}
              anchor="bottom"
            >
              <div className="relative">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    fill="#EF4444"
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
                {name && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-white rounded shadow-md whitespace-nowrap text-xs font-medium text-gray-900 border border-gray-200">
                    {name}
                  </div>
                )}
              </div>
            </Marker>
          )}
          {showUserLocation && userLocation && (
            <Marker
              longitude={userLocation.lon}
              latitude={userLocation.lat}
              anchor="center"
            >
              <div className="relative">
                <div className="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75" />
                <div className="relative w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
              </div>
            </Marker>
          )}
          <AttributionControl compact={true} position="bottom-right" />
        </Map>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Map proudly hosted by OpenStreetMap United States
      </div>
    </div>
  )
}
