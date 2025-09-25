import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { placesApi, checkinsApi, osmApi, POI } from '@fourmore/shared'
import { useNavigation, useRoute } from '@react-navigation/native'

interface PlaceDetailsParams {
  poiId: number
}

export function PlaceDetailsScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { poiId } = route.params as PlaceDetailsParams

  const [poi, setPoi] = useState<POI | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [confirmingInfo, setConfirmingInfo] = useState(false)

  useEffect(() => {
    fetchPlaceDetails()
  }, [poiId])

  const fetchPlaceDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const placeData = await placesApi.getDetails(poiId)
      setPoi(placeData)
    } catch (err) {
      setError('Failed to load place details')
      console.error('Error fetching place details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!poi) return

    try {
      setCheckinLoading(true)
      const checkin = await checkinsApi.create({
        poi_id: poi.id,
      })
      Alert.alert('Success!', `Checked in to ${poi.name}`)
    } catch (err) {
      Alert.alert('Error', 'Failed to check in. Please try again.')
      console.error('Check-in failed:', err)
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleConfirmInfo = async () => {
    if (!poi) return

    try {
      setConfirmingInfo(true)
      const result = await osmApi.confirmInfo(poi.id)
      if (result.success) {
        Alert.alert(
          'Thank you!',
          'Your confirmation has been submitted to OpenStreetMap.'
        )
      } else {
        Alert.alert('Info', result.message || 'Unable to confirm information at this time.')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to confirm information. Please try again.')
      console.error('Confirm info failed:', err)
    } finally {
      setConfirmingInfo(false)
    }
  }

  const openWebsite = (url: string) => {
    if (url) {
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`
      Linking.openURL(formattedUrl)
    }
  }

  const openPhone = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Place Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading place details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !poi) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Place Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to load place</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={fetchPlaceDetails}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Info */}
        <View style={styles.mainInfo}>
          <Text style={styles.placeName}>{poi.name}</Text>
          <Text style={styles.placeCategory}>{poi.category}</Text>
          {poi.subcategory && (
            <Text style={styles.placeSubcategory}>{poi.subcategory}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.checkInButton, checkinLoading && styles.checkInButtonLoading]}
            onPress={handleCheckIn}
            disabled={checkinLoading}
          >
            {checkinLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.checkInButtonText}>Check In Here</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, confirmingInfo && styles.confirmButtonLoading]}
            onPress={handleConfirmInfo}
            disabled={confirmingInfo}
          >
            {confirmingInfo ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
                <Text style={styles.confirmButtonText}>Confirm Info</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        {(poi.phone || poi.website) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            {poi.phone && (
              <TouchableOpacity style={styles.contactItem} onPress={() => openPhone(poi.phone!)}>
                <Ionicons name="call" size={20} color="#3B82F6" />
                <Text style={styles.contactText}>{poi.phone}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
            {poi.website && (
              <TouchableOpacity style={styles.contactItem} onPress={() => openWebsite(poi.website!)}>
                <Ionicons name="globe" size={20} color="#3B82F6" />
                <Text style={styles.contactText}>{poi.website}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Hours */}
        {poi.opening_hours && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hours</Text>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{poi.opening_hours}</Text>
            </View>
          </View>
        )}

        {/* Address */}
        {poi.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{poi.address}</Text>
            </View>
          </View>
        )}

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoGridItem}>
              <Text style={styles.infoLabel}>OSM Type</Text>
              <Text style={styles.infoValue}>{poi.osm_type}</Text>
            </View>
            <View style={styles.infoGridItem}>
              <Text style={styles.infoLabel}>OSM ID</Text>
              <Text style={styles.infoValue}>{poi.osm_id}</Text>
            </View>
            <View style={styles.infoGridItem}>
              <Text style={styles.infoLabel}>Coordinates</Text>
              <Text style={styles.infoValue}>
                {poi.lat.toFixed(6)}, {poi.lon.toFixed(6)}
              </Text>
            </View>
            {poi.updated_at && (
              <View style={styles.infoGridItem}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>
                  {new Date(poi.updated_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  mainInfo: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
  },
  placeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '500',
    marginBottom: 2,
  },
  placeSubcategory: {
    fontSize: 16,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  checkInButton: {
    flex: 1,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  checkInButtonLoading: {
    backgroundColor: '#6b7280',
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  confirmButtonLoading: {
    borderColor: '#6b7280',
  },
  confirmButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  infoGrid: {
    gap: 16,
  },
  infoGridItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
})