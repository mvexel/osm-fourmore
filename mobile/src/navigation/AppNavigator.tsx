import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'

// Placeholder screens - will be implemented later
import { NearbyScreen } from '../screens/NearbyScreen'
import { CheckInsScreen } from '../screens/CheckInsScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { PlaceDetailsScreen } from '../screens/PlaceDetailsScreen'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Nearby"
        component={NearbyScreen}
        options={{
          tabBarIcon: () => null, // Will add icons later
        }}
      />
      <Tab.Screen
        name="CheckIns"
        component={CheckInsScreen}
        options={{
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: () => null,
        }}
      />
    </Tab.Navigator>
  )
}

export function AppNavigator() {
  // For now, we'll start with main tabs
  // TODO: Add authentication state management

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}