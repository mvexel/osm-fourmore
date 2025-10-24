import { useEffect, useMemo, useRef, useState } from 'react'
import { placesApi } from '../services/api'
import type { POI, SearchRequest } from '../types'

const DEFAULT_MIN_QUERY_LENGTH = 3
const DEFAULT_DEBOUNCE_MS = 300

interface UsePlaceSuggestionsOptions {
  query: string
  isEnabled: boolean
  location?: { lat: number; lon: number } | null
  minQueryLength?: number
  debounceMs?: number
}

interface UsePlaceSuggestionsResult {
  suggestions: POI[]
  rawSuggestions: POI[]
  isFetching: boolean
  error: string | null
  hasMinimumQuery: boolean
  reset: () => void
  setError: (error: string | null) => void
}

export function usePlaceSuggestions({
  query,
  isEnabled,
  location,
  minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UsePlaceSuggestionsOptions): UsePlaceSuggestionsResult {
  const [rawSuggestions, setRawSuggestions] = useState<POI[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestCounterRef = useRef(0)

  const trimmedQuery = useMemo(() => query.trim(), [query])
  const hasMinimumQuery = trimmedQuery.length >= minQueryLength

  useEffect(() => {
    if (!isEnabled) {
      setRawSuggestions([])
      setIsFetching(false)
      setError(null)
      return
    }

    if (!hasMinimumQuery) {
      setRawSuggestions([])
      setIsFetching(false)
      setError(null)
      return
    }

    let cancelled = false
    const nextRequestId = requestCounterRef.current + 1
    requestCounterRef.current = nextRequestId
    setIsFetching(true)
    setError(null)

    const timeoutId = window.setTimeout(() => {
      const run = async () => {
        try {
          const request: SearchRequest = {
            query: trimmedQuery,
            limit: 5,
            lat: location?.lat ?? undefined,
            lon: location?.lon ?? undefined,
            radius: 5000,
          }
          const results = await placesApi.search(request)
          if (!cancelled && requestCounterRef.current === nextRequestId) {
            setRawSuggestions(results)
          }
        } catch (suggestError) {
          console.error('Failed to fetch suggestions', suggestError)
          if (!cancelled && requestCounterRef.current === nextRequestId) {
            setError('Search is unavailable right now. Try again shortly.')
            setRawSuggestions([])
          }
        } finally {
          if (!cancelled && requestCounterRef.current === nextRequestId) {
            setIsFetching(false)
          }
        }
      }

      void run()
    }, debounceMs)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [debounceMs, hasMinimumQuery, isEnabled, location?.lat, location?.lon, minQueryLength, trimmedQuery])

  const suggestions = useMemo(() => {
    if (!hasMinimumQuery) {
      return []
    }

    const lowerQuery = trimmedQuery.toLowerCase()
    return rawSuggestions.filter((poi) => {
      const name = (poi.name || '').toLowerCase()
      const category = (poi.class || '').replace(/_/g, ' ').toLowerCase()
      return name.includes(lowerQuery) || category.includes(lowerQuery)
    })
  }, [hasMinimumQuery, rawSuggestions, trimmedQuery])

  const reset = () => {
    setRawSuggestions([])
    setIsFetching(false)
    setError(null)
  }

  return {
    suggestions,
    rawSuggestions,
    isFetching,
    error,
    hasMinimumQuery,
    reset,
    setError,
  }
}
