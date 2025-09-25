import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { placesApi, checkinsApi, POI } from '@fourmore/shared'
import { useGeolocation } from '../hooks/useGeolocation'
import { useNavigation } from '@react-navigation/native'

export function NearbyScreen() {
  const navigation = useNavigation()
  const { latitude, longitude, error: locationError, loading: locationLoading, retry } = useGeolocation()
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkinLoading, setCheckinLoading] = useState<number | null>(null)

  const radius = 1000 // 1km radius

  // Fetch nearby places when location is available
  useEffect(() => {
    if (latitude && longitude) {
      fetchNearbyPlaces()
    }
  }, [latitude, longitude])

  const fetchNearbyPlaces = async () => {
    if (!latitude || !longitude) return

    try {
      setLoading(true)
      setError(null)

      const nearbyPois = await placesApi.getNearby({
        lat: latitude,
        lon: longitude,
        radius,
        limit: 20,
        offset: 0,
      })

      setPois(nearbyPois)
    } catch (err) {
      setError('Failed to load nearby places')
      console.error('Error fetching nearby places:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (poi: POI) => {
    try {
      setCheckinLoading(poi.id)

      const checkin = await checkinsApi.create({
        poi_id: poi.id,
        user_lat: latitude || undefined,
        user_lon: longitude || undefined,
      })

      Alert.alert('Success!', `Checked in to ${poi.name}`)
    } catch (err) {
      Alert.alert('Error', 'Failed to check in. Please try again.')
      console.error('Check-in failed:', err)
    } finally {
      setCheckinLoading(null)
    }
  }

  const handlePOIPress = (poi: POI) => {
    navigation.navigate('PlaceDetails' as never, { poiId: poi.id } as never)
  }

  if (locationLoading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="location" size={64} color="#3B82F6" />
        <Text style={styles.title}>Getting your location...</Text>
        <Text style={styles.subtitle}>
          We need to know where you are to find nearby places
        </Text>
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
      </View>
    )
  }

  if (locationError) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="location-outline" size={64} color="#EF4444" />
        <Text style={styles.title}>Location needed</Text>
        <Text style={styles.subtitle}>{locationError}</Text>
        <TouchableOpacity style={styles.button} onPress={retry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderPOI = ({ item }: { item: POI }) => (
    <TouchableOpacity
      style={styles.poiCard}
      onPress={() => handlePOIPress(item)}
    >
      <View style={styles.poiHeader}>
        <View style={styles.poiInfo}>
          <Text style={styles.poiName}>{item.name}</Text>
          <Text style={styles.poiCategory}>{item.category}</Text>
          {item.distance && (
            <Text style={styles.poiDistance}>
              {Math.round(item.distance)}m away
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.checkInButton,
            checkinLoading === item.id && styles.checkInButtonLoading,
          ]}
          onPress={() => handleCheckIn(item)}
          disabled={checkinLoading === item.id}
        >
          {checkinLoading === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.checkInButtonText}>Check In</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Places</Text>
        <TouchableOpacity onPress={fetchNearbyPlaces} disabled={loading}>
          <Ionicons
            name="refresh"
            size={24}
            color={loading ? "#999" : "#3B82F6"}
          />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={fetchNearbyPlaces}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && pois.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={48} color="#999" />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>
            Try moving to a different location or increasing the search radius.
          </Text>
        </View>
      )}

      {!loading && !error && pois.length > 0 && (
        <FlatList
          data={pois}
          renderItem={renderPOI}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  loader: {
    marginTop: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  poiCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  poiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poiInfo: {
    flex: 1,
    marginRight: 16,
  },
  poiName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  poiCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  poiDistance: {
    fontSize: 12,
    color: '#9ca3af',
  },
  checkInButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  checkInButtonLoading: {
    backgroundColor: '#6b7280',
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})