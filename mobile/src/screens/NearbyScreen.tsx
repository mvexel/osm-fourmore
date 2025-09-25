import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export function NearbyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Places</Text>
      <Text style={styles.subtitle}>This will show nearby places to check in to</Text>
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