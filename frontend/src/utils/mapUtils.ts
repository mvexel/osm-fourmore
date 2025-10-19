/**
 * Map utilities for bbox calculations and coordinate conversions
 */

const EARTH_CIRCUMFERENCE = 40075017 // meters at equator

/**
 * Calculate the ground resolution (meters per pixel) at a given latitude and zoom level
 * Based on Web Mercator projection
 */
function getGroundResolution(latitude: number, zoom: number): number {
  return (Math.cos(latitude * Math.PI / 180) * EARTH_CIRCUMFERENCE) / (256 * Math.pow(2, zoom))
}

/**
 * Calculate a bounding box for a given center point, zoom level, and viewport dimensions
 * Returns bbox coordinates that match what would be visible on the map at that zoom
 */
export function calculateBboxFromZoom(
  lat: number,
  lon: number,
  zoom: number,
  viewportWidth = 448, // Default to max-w-md (mobile)
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight * 0.6 : 600
): { north: number; south: number; east: number; west: number } {
  // Get meters per pixel at this latitude and zoom
  const metersPerPixel = getGroundResolution(lat, zoom)

  // Calculate dimensions in meters
  const widthMeters = viewportWidth * metersPerPixel
  const heightMeters = viewportHeight * metersPerPixel

  // Convert to degrees
  // 1 degree latitude ≈ 111,320 meters everywhere
  const latDelta = (heightMeters / 2) / 111320

  // 1 degree longitude varies by latitude
  const lonDelta = (widthMeters / 2) / (111320 * Math.cos(lat * Math.PI / 180))

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta,
  }
}

/**
 * Calculate the zoom level needed to fit a bounding box in a viewport
 */
export function calculateZoomFromBbox(
  bbox: { north: number; south: number; east: number; west: number },
  viewportWidth = 448,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight * 0.6 : 600
): number {
  const latDiff = bbox.north - bbox.south
  const lonDiff = bbox.east - bbox.west

  // Use the center latitude for calculations
  const centerLat = (bbox.north + bbox.south) / 2

  // Calculate required zoom for each dimension
  const heightMeters = latDiff * 111320
  const widthMeters = lonDiff * (111320 * Math.cos(centerLat * Math.PI / 180))

  const zoomForHeight = Math.log2((Math.cos(centerLat * Math.PI / 180) * EARTH_CIRCUMFERENCE) / (heightMeters / viewportHeight * 256))
  const zoomForWidth = Math.log2((Math.cos(centerLat * Math.PI / 180) * EARTH_CIRCUMFERENCE) / (widthMeters / viewportWidth * 256))

  // Use the smaller zoom to ensure everything fits
  return Math.min(zoomForHeight, zoomForWidth)
}
