import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { checkinsApi, CheckIn } from '@fourmore/shared'
import { useNavigation } from '@react-navigation/native'

export function CheckInsScreen() {
  const navigation = useNavigation()
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetchCheckins()
  }, [])

  const fetchCheckins = async (pageNum = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      const response = await checkinsApi.getHistory(pageNum, 20)

      if (append) {
        setCheckins(prev => [...prev, ...response.checkins])
      } else {
        setCheckins(response.checkins)
      }

      setHasMore(response.checkins.length === 20) // If we got 20, there might be more
      setPage(pageNum + 1)
    } catch (err) {
      setError('Failed to load check-ins')
      console.error('Error fetching check-ins:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchCheckins(1, false)
  }

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchCheckins(page, true)
    }
  }

  const handlePlacePress = (checkin: CheckIn) => {
    navigation.navigate('PlaceDetails' as never, { poiId: checkin.poi.id } as never)
  }

  const handleDeleteCheckin = (checkin: CheckIn) => {
    Alert.alert(
      'Delete Check-in',
      `Are you sure you want to delete your check-in to ${checkin.poi.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCheckin(checkin.id),
        },
      ]
    )
  }

  const deleteCheckin = async (checkinId: number) => {
    try {
      await checkinsApi.delete(checkinId)
      setCheckins(prev => prev.filter(c => c.id !== checkinId))
      Alert.alert('Success', 'Check-in deleted successfully')
    } catch (err) {
      Alert.alert('Error', 'Failed to delete check-in. Please try again.')
      console.error('Error deleting check-in:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderCheckin = ({ item }: { item: CheckIn }) => (
    <View style={styles.checkinCard}>
      <TouchableOpacity
        style={styles.checkinContent}
        onPress={() => handlePlacePress(item)}
      >
        <View style={styles.checkinHeader}>
          <View style={styles.checkinInfo}>
            <Text style={styles.placeName}>{item.poi.name}</Text>
            <Text style={styles.placeCategory}>{item.poi.category}</Text>
            <Text style={styles.checkinDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.checkinActions}>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </View>
        {item.comment && (
          <Text style={styles.checkinComment}>{item.comment}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteCheckin(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No check-ins yet</Text>
      <Text style={styles.emptySubtitle}>
        Start exploring nearby places and check in to your first location!
      </Text>
    </View>
  )

  const renderFooter = () => {
    if (!loadingMore) return null

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check-ins</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your check-ins...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check-ins</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to load check-ins</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => fetchCheckins()}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Check-ins</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Ionicons
            name="refresh"
            size={24}
            color={refreshing ? "#999" : "#3B82F6"}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={checkins}
        renderItem={renderCheckin}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={checkins.length === 0 ? styles.emptyListContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyListContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  checkinCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
  checkinContent: {
    padding: 16,
  },
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkinInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
  },
  checkinDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  checkinActions: {
    padding: 4,
  },
  checkinComment: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
})