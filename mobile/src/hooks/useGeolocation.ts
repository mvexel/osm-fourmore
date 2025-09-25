import { useState, useEffect } from 'react'
import * as Location from 'expo-location'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    let isMounted = true

    const getLocation = async () => {
      try {
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          if (isMounted) {
            setState({
              latitude: null,
              longitude: null,
              error: 'Location permission denied',
              loading: false,
            })
          }
          return
        }

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 100,
        })

        if (isMounted) {
          setState({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            error: null,
            loading: false,
          })
        }
      } catch (error) {
        if (isMounted) {
          setState({
            latitude: null,
            longitude: null,
            error: 'Unable to get your location',
            loading: false,
          })
        }
      }
    }

    getLocation()

    return () => {
      isMounted = false
    }
  }, [])

  const retry = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 0, // Force fresh location
        distanceInterval: 0,
      })

      setState({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        error: null,
        loading: false,
      })
    } catch (error) {
      setState({
        latitude: null,
        longitude: null,
        error: 'Unable to get your location',
        loading: false,
      })
    }
  }

  return { ...state, retry }
}