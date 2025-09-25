import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export function PlaceDetailsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Place Details</Text>
      <Text style={styles.subtitle}>Detailed information about a place will be shown here</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
})