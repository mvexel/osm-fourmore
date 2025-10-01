# Mobile Conversion Guide: React Web to React Native

# Claude Code wrote 100% of this but hey it's a start

**Document Status**: Analysis & Planning
**Last Updated**: September 30, 2025
**Estimated Total Effort**: 4-8 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Recommended Approach](#recommended-approach)
4. [Detailed Work Breakdown](#detailed-work-breakdown)
5. [Component Migration Guide](#component-migration-guide)
6. [Code Reusability Assessment](#code-reusability-assessment)
7. [Technical Challenges](#technical-challenges)
8. [Alternative Approaches](#alternative-approaches)
9. [Migration Roadmap](#migration-roadmap)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Considerations](#deployment-considerations)

---

## Executive Summary

FourMore is currently a React TypeScript web application optimized for mobile browsers. This document outlines the strategy, effort, and technical considerations for converting it to native iOS and Android applications using React Native with Expo.

### Key Findings

- **Current State**: Well-architected React web app with 7 pages, 10 components, TypeScript, API-driven backend
- **Recommended Framework**: React Native with Expo
- **Estimated Effort**: 4-8 weeks for feature-complete MVP
- **Code Reusability**: ~70-80% of business logic, 0-20% of UI code
- **Main Challenges**: Map integration, OAuth flow, geolocation, navigation system

### Why React Native?

1. Leverage existing React + TypeScript expertise
2. High code reuse for business logic
3. True native performance and UX
4. Excellent ecosystem (Expo, navigation, maps)
5. Single codebase for iOS and Android
6. Strong community and tooling support

---

## Current Architecture Analysis

### Frontend Stack

```
Technology          Purpose                    Mobile Impact
────────────────────────────────────────────────────────────────
React 18           UI framework               ✅ Compatible
TypeScript         Type safety                ✅ Fully reusable
Vite               Build tool                 ❌ Replace with Metro
react-router-dom   Navigation                 ❌ Replace with React Navigation
TailwindCSS        Styling                    ❌ Replace with StyleSheet/NativeWind
@vis.gl/maplibre   Maps                       ❌ Replace with native map library
axios              HTTP client                ✅ Fully compatible
date-fns           Date utilities             ✅ Fully compatible
@tabler/icons      Icons                      ⚠️  Need react-native-svg wrapper
```

### Current Component Structure

**Pages (7):**
- `Login.tsx` - OAuth initiation
- `AuthCallback.tsx` - OAuth completion
- `Nearby.tsx` - Main POI discovery (scroll-based pagination)
- `PlaceDetails.tsx` - Individual POI view
- `CheckIns.tsx` - Check-in history
- `CheckinSuccess.tsx` - Post check-in confirmation
- `Profile.tsx` - User profile and stats

**Components (10):**
- `Layout.tsx` - App shell with header and bottom navigation
- `POICard.tsx` - Place listing card
- `CheckedInStatus.tsx` - Current check-in banner
- `LocationMap.tsx` - MapLibre map wrapper
- `BusinessDetailsCard.tsx` - Place info display
- `QuestDialog.tsx` - OSM contribution prompts
- `OSMTag.tsx`, `OSMTags.tsx` - Tag display
- `OSMContribution.tsx` - Contribution UI
- `DoubleConfirmButton.tsx` - Confirmation UX

### Current Features Requiring Platform APIs

| Feature | Current Implementation | Mobile Equivalent |
|---------|----------------------|-------------------|
| Geolocation | `navigator.geolocation` | `expo-location` |
| Storage | `localStorage` | `@react-native-async-storage` |
| OAuth | Browser redirects | Deep linking + `expo-auth-session` |
| Maps | MapLibre GL JS | MapLibre Native or react-native-maps |
| Network | `axios` | `axios` (same) |

### Backend Architecture

**Good News**: Backend is already mobile-ready!

- FastAPI REST API (works perfectly with mobile)
- JWT authentication (mobile-friendly)
- PostgreSQL + PostGIS (no changes needed)
- CORS configured (may need mobile app origin)

**Minor Adjustments Needed**:
- Add OAuth redirect URIs for mobile deep links
- Adjust CORS for mobile app bundle IDs
- Consider connection timeout tuning for mobile networks

---

## Recommended Approach

### Framework: React Native with Expo

**Expo Managed Workflow** provides:
- Zero native code configuration initially
- Over-the-air updates
- Excellent developer experience
- Easy build and deployment
- Rich ecosystem of packages

### Migration Strategy: Incremental Rewrite

**Phase 1: Core Infrastructure (Week 1-2)**
1. Set up React Native + Expo project
2. Configure TypeScript
3. Implement navigation structure
4. Set up API client and auth
5. Implement async storage

**Phase 2: Essential Features (Week 2-4)**
1. Authentication flow with OAuth
2. Nearby places list
3. Place details view
4. Check-in functionality
5. Geolocation integration

**Phase 3: Secondary Features (Week 4-6)**
1. Check-in history
2. Profile and stats
3. Map integration
4. OSM contribution features

**Phase 4: Polish & Testing (Week 6-8)**
1. UI/UX refinement
2. Performance optimization
3. Error handling
4. Testing on real devices
5. App store preparation

---

## Detailed Work Breakdown

### 1. Project Setup & Infrastructure (3-4 days)

#### Tasks
- [ ] Initialize Expo project with TypeScript template
- [ ] Configure project structure matching web app
- [ ] Set up ESLint and Prettier for React Native
- [ ] Configure environment variables (different from Vite)
- [ ] Set up development environment (iOS Simulator, Android Emulator)
- [ ] Install core dependencies

#### New Dependencies
```json
{
  "dependencies": {
    "react-native": "~0.74.0",
    "expo": "~51.0.0",
    "expo-status-bar": "~1.12.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.10.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "~3.31.0",
    "@react-native-async-storage/async-storage": "1.23.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0"
  }
}
```

#### Configuration Files
- `app.json` - Expo configuration
- `babel.config.js` - Metro bundler config
- `tsconfig.json` - TypeScript config for React Native
- `.env` files - Environment variable handling

---

### 2. Navigation System (3-4 days)

#### Current: React Router
```typescript
// frontend/src/App.tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/nearby" element={<Layout><Nearby /></Layout>} />
  {/* ... */}
</Routes>
```

#### Target: React Navigation
```typescript
// mobile/src/navigation/AppNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
    </Stack.Navigator>
  );
}

// Main Tabs
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Nearby" component={NearbyScreen} />
      <Tab.Screen name="CheckIns" component={CheckInsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root Navigator
export function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
```

#### Migration Tasks
- [ ] Replace `react-router-dom` with `@react-navigation/*`
- [ ] Convert all `<Link>` to `navigation.navigate()`
- [ ] Convert all `useNavigate()` hooks to `useNavigation()`
- [ ] Implement tab navigator for bottom navigation
- [ ] Set up stack navigator for nested screens
- [ ] Configure screen options (headers, transitions)
- [ ] Implement deep linking for OAuth callbacks

---

### 3. Styling System Migration (1-2 weeks)

#### Current: TailwindCSS
```typescript
<div className="flex flex-col items-center justify-center min-h-96 p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-2">Getting your location...</h2>
</div>
```

#### Option A: React Native StyleSheet (Recommended for MVP)
```typescript
import { View, Text, StyleSheet } from 'react-native';

<View style={styles.container}>
  <Text style={styles.heading}>Getting your location...</Text>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 384,
    padding: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
});
```

#### Option B: NativeWind (TailwindCSS-like for React Native)
```typescript
import { View, Text } from 'react-native';

<View className="flex-1 items-center justify-center min-h-96 p-6">
  <Text className="text-lg font-semibold text-gray-900 mb-2">
    Getting your location...
  </Text>
</View>
```

**Recommendation**: Start with StyleSheet for stability, consider NativeWind later.

#### Color System
Extract Tailwind colors to a theme file:
```typescript
// mobile/src/theme/colors.ts
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    // ... from your Tailwind config
    600: '#2563eb',
  },
  gray: {
    50: '#f9fafb',
    // ...
    900: '#111827',
  },
};
```

#### Migration Tasks
- [ ] Create theme configuration (colors, spacing, typography)
- [ ] Convert all components from TailwindCSS to StyleSheet
- [ ] Set up consistent spacing system (use multiples of 4 or 8)
- [ ] Implement responsive design with Dimensions API
- [ ] Handle safe areas for notches and home indicators

---

### 4. Geolocation Integration (2-3 days)

#### Current: Browser Geolocation API
```typescript
// frontend/src/hooks/useGeolocation.ts
navigator.geolocation.getCurrentPosition(
  handleSuccess,
  handleError,
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
);
```

#### Target: Expo Location
```typescript
// mobile/src/hooks/useGeolocation.ts
import * as Location from 'expo-location';
import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setState(prev => ({
          ...prev,
          error: 'Location permission denied',
          loading: false,
        }));
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setState({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          error: null,
          loading: false,
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Unable to get location',
          loading: false,
        }));
      }
    })();
  }, []);

  const retry = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    // Re-run location fetch logic
  };

  return { ...state, retry };
}
```

#### iOS Configuration (app.json)
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "FourMore needs your location to find nearby places to check in."
      }
    }
  }
}
```

#### Android Configuration (app.json)
```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

#### Migration Tasks
- [ ] Replace `navigator.geolocation` with `expo-location`
- [ ] Implement permission request flow
- [ ] Add permission rationale UI for denied states
- [ ] Handle location services disabled state
- [ ] Test on both iOS and Android
- [ ] Implement background location (if needed for future features)

---

### 5. OAuth Implementation (3-5 days)

This is one of the **most complex** parts of the migration.

#### Current: Browser Redirect Flow
```typescript
// 1. User clicks login
// 2. Backend returns OSM OAuth URL
// 3. Browser redirects to OSM
// 4. OSM redirects back to /auth/callback?code=...
// 5. Frontend extracts code, sends to backend
```

#### Target: Deep Linking + Expo AuthSession

**Step 1: Configure Deep Linking**

`app.json`:
```json
{
  "expo": {
    "scheme": "fourmore",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "fourmore",
              "host": "auth"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.fourmore",
      "associatedDomains": ["applinks:fourmore.app"]
    }
  }
}
```

**Step 2: Implement Auth Flow**

```typescript
// mobile/src/screens/LoginScreen.tsx
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: 'YOUR_OSM_CLIENT_ID',
      scopes: ['read_prefs', 'write_api'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'fourmore',
        path: 'auth',
      }),
    },
    {
      authorizationEndpoint: 'https://www.openstreetmap.org/oauth2/authorize',
    }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      // Send code to your backend
      handleOAuthCallback(code);
    }
  }, [response]);

  const handleLogin = async () => {
    await promptAsync();
  };

  return (
    <View style={styles.container}>
      <Button title="Login with OpenStreetMap" onPress={handleLogin} />
    </View>
  );
}
```

**Step 3: Backend Configuration**

Update backend OAuth redirect URI allowlist to include:
- `fourmore://auth` (for native app)
- Keep existing web URIs for development

#### Migration Tasks
- [ ] Configure deep linking in app.json
- [ ] Install and configure `expo-auth-session`
- [ ] Rewrite Login screen for mobile OAuth flow
- [ ] Update backend OAuth configuration
- [ ] Test OAuth on both platforms
- [ ] Handle edge cases (cancelled auth, network errors)
- [ ] Implement token refresh logic

---

### 6. Storage Migration (1-2 days)

#### Current: localStorage
```typescript
// Storing token
localStorage.setItem('fourmore_token', token);

// Reading token
const token = localStorage.getItem('fourmore_token');

// Removing token
localStorage.removeItem('fourmore_token');
```

#### Target: AsyncStorage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storing token
await AsyncStorage.setItem('fourmore_token', token);

// Reading token
const token = await AsyncStorage.getItem('fourmore_token');

// Removing token
await AsyncStorage.removeItem('fourmore_token');

// Store objects
await AsyncStorage.setItem('fourmore_user', JSON.stringify(user));
const user = JSON.parse(await AsyncStorage.getItem('fourmore_user') || '{}');
```

#### Create Storage Abstraction
```typescript
// mobile/src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async setToken(token: string) {
    await AsyncStorage.setItem('fourmore_token', token);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('fourmore_token');
  },

  async removeToken() {
    await AsyncStorage.removeItem('fourmore_token');
  },

  async setUser(user: User) {
    await AsyncStorage.setItem('fourmore_user', JSON.stringify(user));
  },

  async getUser(): Promise<User | null> {
    const data = await AsyncStorage.getItem('fourmore_user');
    return data ? JSON.parse(data) : null;
  },

  async removeUser() {
    await AsyncStorage.removeItem('fourmore_user');
  },

  async clear() {
    await AsyncStorage.clear();
  },
};
```

#### Update API Interceptor
```typescript
// mobile/src/services/api.ts
import axios from 'axios';
import { storage } from './storage';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Request interceptor - add token
api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.removeToken();
      await storage.removeUser();
      // Trigger navigation to login - requires navigation ref
      navigationRef.navigate('Login');
    }
    return Promise.reject(error);
  }
);
```

#### Migration Tasks
- [ ] Install `@react-native-async-storage/async-storage`
- [ ] Create storage abstraction layer
- [ ] Update AuthContext to use AsyncStorage
- [ ] Update API interceptors to use async storage
- [ ] Test storage persistence across app restarts
- [ ] Implement migration from web localStorage (if needed for hybrid)

---

### 7. Map Integration (1 week)

**This is the most visually complex migration.**

#### Current: MapLibre GL JS
```typescript
// frontend/src/components/LocationMap.tsx
import { Map, Marker } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

<Map
  initialViewState={{ longitude: lon, latitude: lat, zoom }}
  style={{ width: '100%', height: '100%' }}
  mapStyle={mapStyle}
>
  <Marker longitude={lon} latitude={lat} anchor="bottom">
    {/* Custom marker SVG */}
  </Marker>
</Map>
```

#### Option A: React Native MapLibre (Recommended - Free, OSM-friendly)

**Installation**:
```bash
npm install @maplibre/maplibre-react-native
```

**Implementation**:
```typescript
// mobile/src/components/LocationMap.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

// Must be called before using MapLibre
MapLibreGL.setAccessToken(null); // null for self-hosted tiles

interface LocationMapProps {
  lat: number;
  lon: number;
  name?: string;
  zoom?: number;
  height?: number;
  showMarker?: boolean;
  showUserLocation?: boolean;
}

export function LocationMap({
  lat,
  lon,
  name,
  zoom = 16,
  height = 300,
  showMarker = true,
  showUserLocation = false,
}: LocationMapProps) {
  const cameraConfig = {
    centerCoordinate: [lon, lat],
    zoomLevel: zoom,
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL="https://tiles.openstreetmap.us/styles/osm-bright/style.json"
      >
        <MapLibreGL.Camera {...cameraConfig} />

        {showMarker && (
          <MapLibreGL.PointAnnotation
            id="place-marker"
            coordinate={[lon, lat]}
          >
            <View style={styles.marker}>
              <View style={styles.markerInner} />
            </View>
          </MapLibreGL.PointAnnotation>
        )}

        {showUserLocation && (
          <MapLibreGL.UserLocation visible={true} />
        )}
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    borderWidth: 3,
    borderColor: 'white',
  },
});
```

#### Option B: React Native Maps (Google Maps/Apple Maps)

Simpler but requires API keys:
```typescript
import MapView, { Marker } from 'react-native-maps';

<MapView
  style={styles.map}
  initialRegion={{
    latitude: lat,
    longitude: lon,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
>
  <Marker coordinate={{ latitude: lat, longitude: lon }} />
</MapView>
```

#### Migration Tasks
- [ ] Choose map library (MapLibre for OSM, react-native-maps for simplicity)
- [ ] Install and configure chosen library
- [ ] Rewrite LocationMap component
- [ ] Implement custom marker rendering
- [ ] Handle map interactions (tap, zoom, pan)
- [ ] Test map performance on both platforms
- [ ] Implement map style configuration
- [ ] Handle user location display
- [ ] Test with PlaceDetails screen

---

### 8. List Optimization (2-3 days)

#### Current: Infinite Scroll with Scroll Events
```typescript
// frontend/src/pages/Nearby.tsx
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

  if (distanceFromBottom <= 200 && hasNextPage && !isLoadingMore) {
    loadMorePlaces();
  }
};

<div onScroll={handleScroll} style={{ height: '100vh', overflowY: 'auto' }}>
  {pois.map((poi) => (
    <POICard key={`${poi.osm_type}-${poi.osm_id}`} poi={poi} />
  ))}
</div>
```

#### Target: FlatList with Optimized Rendering
```typescript
// mobile/src/screens/NearbyScreen.tsx
import { FlatList, RefreshControl } from 'react-native';

export function NearbyScreen() {
  const [pois, setPois] = useState<POI[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const renderItem = ({ item }: { item: POI }) => (
    <POICard poi={item} onPress={() => navigateToDetails(item)} />
  );

  const keyExtractor = (item: POI) => `${item.osm_type}-${item.osm_id}`;

  const handleLoadMore = () => {
    if (!hasNextPage || isLoadingMore) return;
    loadMorePlaces();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNearbyPlaces(true);
    setRefreshing(false);
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return <ActivityIndicator size="large" color="#2563eb" />;
  };

  return (
    <FlatList
      data={pois}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={styles.list}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
}
```

**Key Optimizations**:
- `initialNumToRender`: Renders only 10 items initially
- `maxToRenderPerBatch`: Renders 10 items at a time
- `windowSize`: Keeps 5 screens worth of items in memory
- Pull-to-refresh built-in
- Automatic recycling of list items

#### Migration Tasks
- [ ] Replace scroll div with FlatList in Nearby screen
- [ ] Replace scroll div with FlatList in CheckIns screen
- [ ] Implement pull-to-refresh
- [ ] Optimize POICard for FlatList rendering
- [ ] Test scrolling performance with large lists
- [ ] Implement empty state components
- [ ] Add loading indicators

---

### 9. UI Component Migration (1-2 weeks)

#### Component Conversion Matrix

| Web Component | Native Replacement | Complexity |
|---------------|-------------------|------------|
| `<div>` | `<View>` | Low |
| `<span>`, `<p>`, `<h1>-<h6>` | `<Text>` | Low |
| `<button>` | `<Button>` or `<Pressable>` | Medium |
| `<input>` | `<TextInput>` | Medium |
| `<img>` | `<Image>` | Low |
| `<a>` | `<Pressable>` + navigation | Medium |
| `<select>` | `<Picker>` or custom | High |
| `<svg>` | `react-native-svg` | High |
| Custom scrolling | `<ScrollView>` or `<FlatList>` | Medium |

#### Example: POICard Component

**Before (Web)**:
```typescript
// frontend/src/components/POICard.tsx
export function POICard({ poi, onClick }: POICardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getIconForCategory(poi.class)}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{poi.name}</h3>
          <p className="text-sm text-gray-600">{poi.class}</p>
          <p className="text-xs text-gray-400 mt-1">
            {poi.distance_km.toFixed(2)} km away
          </p>
        </div>
      </div>
    </div>
  );
}
```

**After (React Native)**:
```typescript
// mobile/src/components/POICard.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';

export function POICard({ poi, onPress }: POICardProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getIconForCategory(poi.class)}</Text>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {poi.name}
          </Text>
          <Text style={styles.category}>{poi.class}</Text>
          <Text style={styles.distance}>
            {poi.distance_km.toFixed(2)} km away
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // Android shadow
  },
  cardPressed: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  category: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 2,
  },
  distance: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});
```

#### All Components to Migrate

1. **Layout.tsx** → Create stack/tab navigation structure
2. **POICard.tsx** → Convert to Pressable card
3. **CheckedInStatus.tsx** → Convert to banner component
4. **LocationMap.tsx** → Use native map library
5. **BusinessDetailsCard.tsx** → Convert to native card
6. **QuestDialog.tsx** → Use React Native Modal
7. **OSMTag.tsx** → Convert to badge component
8. **OSMTags.tsx** → ScrollView with tags
9. **OSMContribution.tsx** → Form with TextInput
10. **DoubleConfirmButton.tsx** → Button with state

#### Migration Tasks Per Component
- [ ] Convert HTML elements to React Native primitives
- [ ] Convert TailwindCSS classes to StyleSheet
- [ ] Replace onClick with onPress
- [ ] Add press feedback (opacity, scale)
- [ ] Handle text overflow with numberOfLines
- [ ] Test component on both platforms
- [ ] Ensure accessibility (accessibilityLabel, etc.)

---

## Component Migration Guide

### Detailed Component Checklist

#### 1. Layout.tsx → App Navigation Structure

**Complexity**: High
**Estimated Time**: 1-2 days

**Before**:
- Header with logo and user avatar
- Main content area
- Bottom navigation (3 tabs)
- Logout button

**After**:
- Tab navigator at root
- Stack navigator for each tab
- Custom header for logged-in state
- Use React Navigation's built-in tab bar

**Key Changes**:
- Remove Layout component wrapper
- Use `createBottomTabNavigator` for main navigation
- Use `navigation.setOptions()` for dynamic headers
- Use native tab icons

---

#### 2. Login.tsx → LoginScreen

**Complexity**: High (OAuth)
**Estimated Time**: 1-2 days

**Key Changes**:
- Replace redirect-based OAuth with `expo-auth-session`
- Use native Button or custom Pressable
- Add loading state during auth
- Handle deep link callback

---

#### 3. Nearby.tsx → NearbyScreen

**Complexity**: High
**Estimated Time**: 2-3 days

**Key Changes**:
- Replace scroll div with FlatList
- Replace onScroll with onEndReached
- Add RefreshControl for pull-to-refresh
- Use ActivityIndicator for loading states
- Move current check-in to FlatList header

---

#### 4. PlaceDetails.tsx → PlaceDetailsScreen

**Complexity**: Medium
**Estimated Time**: 1-2 days

**Key Changes**:
- Wrap in ScrollView for long content
- Convert buttons to native Pressable
- Integrate native LocationMap
- Use Modal for QuestDialog
- Add header back button

---

#### 5. CheckIns.tsx → CheckInsScreen

**Complexity**: Medium
**Estimated Time**: 1 day

**Key Changes**:
- Replace with FlatList
- Add pull-to-refresh
- Optimize card rendering
- Handle empty state

---

#### 6. Profile.tsx → ProfileScreen

**Complexity**: Medium
**Estimated Time**: 1 day

**Key Changes**:
- Wrap in ScrollView
- Convert stats cards to native Views
- Use native image for avatar
- Add logout functionality
- Handle delete account with Alert.alert()

---

## Code Reusability Assessment

### Fully Reusable (90-100% code reuse)

**API Layer**: `frontend/src/services/api.ts`
- Only change: Replace localStorage with AsyncStorage in interceptors
- All API functions remain identical
- Type definitions stay the same

**Type Definitions**: `frontend/src/types/index.ts`
- 100% reusable
- No changes needed

**Business Logic**: Core logic patterns
- State management patterns (useState, useEffect)
- Data transformation functions
- Validation logic
- Date formatting utilities

### Partially Reusable (40-60% code reuse)

**Hooks**:
- `useAuth.ts` - Logic reusable, storage calls need updating
- `useDoubleConfirm.ts` - Mostly reusable, UI changes needed
- `useGeolocation.ts` - Pattern reusable, API completely different

**Context**:
- `AuthContext.tsx` - Structure reusable, storage implementation changes

### Not Reusable (0-20% code reuse)

**All Component JSX**:
- Every component needs complete UI rewrite
- HTML → React Native primitives
- CSS → StyleSheet
- Event handlers (onClick → onPress)

**Styling**:
- TailwindCSS classes → StyleSheet objects
- No direct conversion available

**Platform Integrations**:
- Geolocation
- Storage
- OAuth flow
- Maps

### Reusability Summary

```
Code Category          Lines  Reusability  Effort to Migrate
──────────────────────────────────────────────────────────────
Business Logic (API)    ~200   95%         1 hour
Type Definitions        ~150   100%        0 hours
Hooks (logic)          ~150   60%         4 hours
Context (logic)        ~100   60%         2 hours
Component Logic        ~800   40%         2 days
Component JSX/UI      ~1500   5%          2-3 weeks
Styling               ~800    0%          1-2 weeks (included in UI)
Platform APIs         ~300    0%          1 week
──────────────────────────────────────────────────────────────
Total                 ~4000   ~25%        4-8 weeks
```

---

## Technical Challenges

### 1. Map Integration ⚠️ **High Priority**

**Challenge**: MapLibre GL JS doesn't work in React Native. Need native implementation.

**Solution Options**:
1. **MapLibre Native** (react-native-mapbox-gl)
   - Pros: Free, OSM-friendly, powerful
   - Cons: Complex setup, larger app size

2. **React Native Maps** (Google/Apple Maps)
   - Pros: Simple, well-maintained, smaller bundle
   - Cons: Requires API keys, not OSM tiles

**Recommendation**: Start with React Native Maps for MVP, migrate to MapLibre later if OSM tiles are required.

**Mitigation**:
- Abstract map component behind interface
- Make map library swappable
- Test early and often on real devices

---

### 2. OAuth Deep Linking ⚠️ **High Priority**

**Challenge**: Browser redirects don't work in mobile apps. Need custom URI scheme.

**Solution**:
1. Register custom scheme (`fourmore://`)
2. Use `expo-auth-session` for OAuth flow
3. Configure backend to accept mobile redirect URIs
4. Handle auth state properly

**Gotchas**:
- iOS requires associated domains for universal links
- Android needs intent filters
- Testing requires real device or careful simulator setup
- Different behavior in development vs. production

**Mitigation**:
- Set up deep linking early
- Test OAuth flow thoroughly
- Implement fallback error handling
- Document redirect URI configuration

---

### 3. Infinite Scroll Performance ⚠️ **Medium Priority**

**Challenge**: Your current implementation loads all items in DOM. Won't scale on mobile.

**Solution**: Use FlatList with windowing
```typescript
<FlatList
  data={pois}
  renderItem={renderItem}
  initialNumToRender={10}      // Only render 10 initially
  maxToRenderPerBatch={10}     // Load 10 at a time
  windowSize={5}               // Keep 5 screens in memory
  onEndReachedThreshold={0.5}  // Trigger load at 50% from bottom
  removeClippedSubviews={true} // Unmount off-screen items
/>
```

**Mitigation**:
- Implement early
- Profile with React DevTools
- Test with 100+ items

---

### 4. Layout Paradigm Shift ⚠️ **Medium Priority**

**Challenge**: React Native layout works differently than web CSS.

**Key Differences**:
- Flexbox by default (not block)
- No CSS Grid
- Different flex defaults (`flexDirection: 'column'` by default)
- No `position: fixed` (use Animated or absolute positioning)
- No `overflow: auto` (use ScrollView)

**Learning Resources**:
- React Native docs on layout
- Practice converting a few components first
- Use `react-native-debugger` to inspect layout

---

### 5. Navigation State Management ⚠️ **Medium Priority**

**Challenge**: React Router state/params work differently than React Navigation.

**Current**:
```typescript
const navigate = useNavigate();
navigate(`/places/${osmType}/${osmId}`, { state: { poi } });

// In target component:
const location = useLocation();
const poi = location.state.poi;
```

**Target**:
```typescript
const navigation = useNavigation();
navigation.navigate('PlaceDetails', {
  osmType,
  osmId,
  poi, // Can pass objects directly
});

// In target component:
const route = useRoute();
const { osmType, osmId, poi } = route.params;
```

**Mitigation**:
- Define navigation types upfront
- Use TypeScript for type-safe navigation
- Consider navigation state carefully

---

### 6. Form Handling ⚠️ **Low-Medium Priority**

**Challenge**: TextInput behavior differs from web inputs.

**Key Differences**:
- No form submission events
- Manual keyboard handling (keyboardType, returnKeyType)
- Need KeyboardAvoidingView or react-native-keyboard-aware-scroll-view
- Different auto-complete behavior

**Example**:
```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={styles.container}
>
  <TextInput
    placeholder="Add a comment"
    value={comment}
    onChangeText={setComment}
    keyboardType="default"
    returnKeyType="done"
    onSubmitEditing={handleSubmit}
  />
</KeyboardAvoidingView>
```

---

### 7. Image Handling ⚠️ **Low Priority**

**Challenge**: Avatar and icon handling differs.

**Current**:
```typescript
<img src={user.avatar_url} alt="Avatar" />
```

**Target**:
```typescript
import { Image } from 'react-native';

<Image
  source={{ uri: user.avatar_url }}
  style={styles.avatar}
  defaultSource={require('./assets/default-avatar.png')}
/>
```

**For SVG Icons**:
Need `react-native-svg` and `react-native-svg-transformer`:
```typescript
import Icon from './icon.svg';

<Icon width={24} height={24} fill="#000" />
```

---

## Alternative Approaches

### Option 1: Progressive Web App (PWA)

**Effort**: 1-2 weeks
**Approach**: Add PWA manifest and service worker to existing web app

**Pros**:
- Minimal development effort
- Reuse 100% of existing code
- Fast time-to-market
- No app store approval needed
- Instant updates

**Cons**:
- Limited native features (push notifications, background location)
- Not in app stores (discoverability)
- Inconsistent experience across browsers
- iOS Safari has limited PWA support
- Can't use native map libraries

**When to Choose**: If you want mobile presence quickly and don't need native features.

---

### Option 2: Capacitor (Ionic)

**Effort**: 2-4 weeks
**Approach**: Wrap web app in native container

**Pros**:
- Reuse ~90% of existing code
- Access to native APIs via plugins
- In app stores
- Single codebase
- Faster than full rewrite

**Cons**:
- Hybrid performance (not fully native)
- Larger app size than native
- WebView quirks and limitations
- Map performance may suffer
- Less polished UX than native

**When to Choose**: If you want native app with minimal effort and can accept hybrid trade-offs.

**Implementation**:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

Then use Capacitor plugins for native features:
- `@capacitor/geolocation`
- `@capacitor/storage`
- `@capacitor/browser` (for OAuth)

---

### Option 3: React Native (Recommended)

**Effort**: 4-8 weeks
**Approach**: Rewrite UI in React Native

**Pros**:
- True native performance and UX
- Best-in-class developer experience
- Large ecosystem
- Reuse business logic
- Future-proof (React Native is mature and growing)

**Cons**:
- Significant UI rewrite required
- Learning curve for React Native specifics
- Platform-specific bugs to handle
- Longer initial development time

**When to Choose**: If you want best native experience and are willing to invest time upfront.

---

### Option 4: Flutter

**Effort**: 8-12 weeks
**Approach**: Complete rewrite in Dart/Flutter

**Pros**:
- Excellent performance
- Beautiful UI out of the box
- Growing ecosystem
- Single codebase
- Hot reload

**Cons**:
- Complete rewrite (0% code reuse)
- New language (Dart)
- Smaller ecosystem than React Native
- No web expertise leverage

**When to Choose**: If you're starting fresh or want best mobile performance and are okay learning Dart.

---

### Comparison Table

| Criterion | PWA | Capacitor | React Native | Flutter |
|-----------|-----|-----------|--------------|---------|
| **Development Time** | 1-2 weeks | 2-4 weeks | 4-8 weeks | 8-12 weeks |
| **Code Reuse** | 100% | 90% | 25% | 0% |
| **Performance** | Good | Good | Excellent | Excellent |
| **Native Feel** | Fair | Good | Excellent | Excellent |
| **App Store** | ❌ | ✅ | ✅ | ✅ |
| **Native APIs** | Limited | Good | Excellent | Excellent |
| **Learning Curve** | Low | Low | Medium | High |
| **Ecosystem** | Web | Medium | Large | Growing |
| **Bundle Size** | Small | Large | Medium | Medium |

---

## Migration Roadmap

### Phase 1: Foundation (Week 1-2)

**Goals**: Set up project, basic navigation, authentication

#### Week 1: Project Setup & Infrastructure
- [ ] Initialize Expo project with TypeScript
- [ ] Set up project structure
- [ ] Configure ESLint, Prettier, TypeScript
- [ ] Install core dependencies (navigation, storage, etc.)
- [ ] Set up environment configuration
- [ ] Configure app.json (name, bundle IDs, permissions)
- [ ] Create basic color theme and constants
- [ ] Set up navigation structure (tabs + stacks)
- [ ] Create placeholder screens for all routes

#### Week 2: Authentication & API
- [ ] Migrate API client (axios, interceptors)
- [ ] Create storage abstraction layer
- [ ] Implement AuthContext with AsyncStorage
- [ ] Configure deep linking for OAuth
- [ ] Implement OAuth flow with expo-auth-session
- [ ] Create Login screen
- [ ] Test OAuth on iOS and Android
- [ ] Handle auth errors and edge cases
- [ ] Update backend OAuth configuration

**Deliverable**: App that can authenticate users via OSM OAuth

---

### Phase 2: Core Features (Week 3-4)

**Goals**: Nearby places, place details, check-in functionality

#### Week 3: Nearby Places
- [ ] Implement geolocation hook with expo-location
- [ ] Request and handle location permissions
- [ ] Migrate places API calls
- [ ] Create POICard component
- [ ] Build NearbyScreen with FlatList
- [ ] Implement infinite scroll with pagination
- [ ] Add pull-to-refresh
- [ ] Handle loading and error states
- [ ] Test list performance with many items

#### Week 4: Place Details & Check-ins
- [ ] Create PlaceDetailsScreen
- [ ] Migrate BusinessDetailsCard component
- [ ] Integrate basic map view (choose library)
- [ ] Implement LocationMap component
- [ ] Migrate check-in API
- [ ] Create check-in button and flow
- [ ] Show current check-in status
- [ ] Handle check-in success/error states
- [ ] Test end-to-end check-in flow

**Deliverable**: Users can see nearby places and check in

---

### Phase 3: History & Profile (Week 5-6)

**Goals**: Check-in history, profile, stats

#### Week 5: Check-in History
- [ ] Create CheckInsScreen with FlatList
- [ ] Migrate check-in history API
- [ ] Build check-in list item component
- [ ] Implement pagination
- [ ] Add pull-to-refresh
- [ ] Show check-in details on tap
- [ ] Implement delete check-in functionality
- [ ] Handle empty state (no check-ins)
- [ ] Test with real check-in data

#### Week 6: Profile & Stats
- [ ] Create ProfileScreen
- [ ] Migrate user stats API
- [ ] Display user avatar and info
- [ ] Show check-in statistics
- [ ] Implement logout functionality
- [ ] Add export functionality (if needed)
- [ ] Implement delete account flow
- [ ] Add settings options
- [ ] Polish UI and interactions

**Deliverable**: Full check-in history and user profile

---

### Phase 4: OSM Contributions (Week 6-7)

**Goals**: Quests, OSM notes, info confirmation

#### Week 6-7: OSM Features
- [ ] Migrate quests API
- [ ] Create QuestDialog component (Modal)
- [ ] Implement quest response flow
- [ ] Add OSM tags display
- [ ] Create info confirmation flow
- [ ] Implement OSM note creation
- [ ] Test OSM API integration
- [ ] Handle OSM API errors gracefully
- [ ] Add "View on OSM" links

**Deliverable**: Users can contribute to OSM via quests

---

### Phase 5: Polish & Testing (Week 7-8)

**Goals**: Bug fixes, performance, UX polish, app store prep

#### Week 7: Polish & Performance
- [ ] Test on real iOS device
- [ ] Test on real Android device
- [ ] Fix platform-specific bugs
- [ ] Optimize FlatList performance
- [ ] Reduce app bundle size
- [ ] Add splash screen
- [ ] Create app icon
- [ ] Improve loading states
- [ ] Add animations/transitions
- [ ] Handle offline scenarios
- [ ] Improve error messages

#### Week 8: Testing & App Store Prep
- [ ] Comprehensive testing (happy paths)
- [ ] Edge case testing (no location, no internet, etc.)
- [ ] Test OAuth edge cases
- [ ] Performance testing with large datasets
- [ ] Accessibility testing (VoiceOver, TalkBack)
- [ ] Prepare app store listings
- [ ] Create screenshots
- [ ] Write app descriptions
- [ ] Configure app store metadata
- [ ] Submit to TestFlight (iOS)
- [ ] Submit to internal testing (Android)
- [ ] Gather beta tester feedback

**Deliverable**: Production-ready app submitted to app stores

---

### Post-Launch: Iteration

- Gather user feedback
- Fix bugs found in production
- Add advanced features (push notifications, etc.)
- Optimize based on analytics
- Consider adding more OSM contribution features

---

## Testing Strategy

### Unit Testing

**What to Test**:
- Business logic functions
- Data transformation utilities
- API client methods
- Storage abstraction
- Custom hooks (with React Native Testing Library)

**Tools**:
```bash
npm install --save-dev @testing-library/react-native jest
```

**Example**:
```typescript
// __tests__/hooks/useGeolocation.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useGeolocation } from '../hooks/useGeolocation';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

describe('useGeolocation', () => {
  it('should return location when granted', async () => {
    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.latitude).toBeDefined();
    });
  });
});
```

---

### Integration Testing

**What to Test**:
- Screen navigation flows
- API integration
- Authentication flow
- Check-in flow end-to-end

**Tools**:
- React Native Testing Library
- Mock Service Worker (MSW) for API mocking

---

### Manual Testing Checklist

**iOS Testing**:
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (notch)
- [ ] iPhone 14 Pro Max (large screen)
- [ ] iPad (tablet layout)
- [ ] Test Dark Mode
- [ ] Test Dynamic Type (accessibility)
- [ ] Test VoiceOver
- [ ] Test on iOS 15, 16, 17

**Android Testing**:
- [ ] Small phone (5" screen)
- [ ] Standard phone (6.5" screen)
- [ ] Large phone (7" screen)
- [ ] Test with back button navigation
- [ ] Test TalkBack
- [ ] Test on Android 10, 11, 12, 13, 14

**Feature Testing**:
- [ ] Login/logout flow
- [ ] Location permissions (grant, deny, already granted)
- [ ] Nearby places loading
- [ ] Infinite scroll pagination
- [ ] Pull to refresh
- [ ] Check-in flow
- [ ] Check-in history
- [ ] Profile stats
- [ ] Map interaction
- [ ] OAuth edge cases (cancel, network error)
- [ ] Offline handling
- [ ] App backgrounding/foregrounding

**Performance Testing**:
- [ ] App launch time < 3 seconds
- [ ] FlatList scrolling is smooth (60fps)
- [ ] Map panning is smooth
- [ ] No memory leaks on list scrolling
- [ ] Low battery impact

---

## Deployment Considerations

### iOS App Store

**Requirements**:
1. Apple Developer Account ($99/year)
2. App Store Connect setup
3. App bundle ID configured
4. Provisioning profiles
5. App icon (all required sizes)
6. Screenshots (all device sizes)
7. Privacy policy URL
8. App description and metadata

**Build Process**:
```bash
# Using Expo EAS Build
eas build --platform ios

# Or using local Xcode
npx expo run:ios --configuration Release
```

**Submission Process**:
1. Create app in App Store Connect
2. Upload build via Xcode or Transporter
3. Submit for review
4. Wait 1-3 days for approval

**Review Guidelines to Follow**:
- Provide test account credentials
- Explain location permission usage clearly
- Ensure privacy policy is complete
- App must not crash

---

### Google Play Store

**Requirements**:
1. Google Play Developer Account ($25 one-time)
2. App signing key
3. App bundle ID configured
4. App icon and feature graphic
5. Screenshots (phone, tablet, possibly 7")
6. Privacy policy URL
7. App description and metadata

**Build Process**:
```bash
# Using Expo EAS Build
eas build --platform android

# Or using local Android Studio
npx expo run:android --variant release
```

**Submission Process**:
1. Create app in Google Play Console
2. Upload AAB (Android App Bundle)
3. Complete store listing
4. Submit for review
5. Wait 1-2 days for approval

**Review Guidelines to Follow**:
- Declare all permissions with explanations
- Target latest Android API level
- Handle Android back button correctly
- Provide privacy policy

---

### Continuous Deployment

**Recommended: Expo EAS**

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build for both platforms
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

**Over-the-Air Updates**:
```bash
# Publish JS updates without app store review
eas update

# Users get updates automatically
```

---

### Environment Variables

**Development**:
```bash
# .env.development
API_BASE_URL=http://localhost:8000
OSM_CLIENT_ID=your_dev_client_id
OSM_CLIENT_SECRET=your_dev_secret
```

**Production**:
```bash
# .env.production
API_BASE_URL=https://api.fourmore.app
OSM_CLIENT_ID=your_prod_client_id
OSM_CLIENT_SECRET=your_prod_secret
```

**Configure in Expo**:
```javascript
// app.config.js
export default {
  expo: {
    extra: {
      apiBaseUrl: process.env.API_BASE_URL,
      osmClientId: process.env.OSM_CLIENT_ID,
    },
  },
};
```

---

## Appendix

### Recommended Dependencies

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.74.0",
    "expo": "~51.0.0",
    "expo-status-bar": "~1.12.0",

    "// Navigation": "",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.10.0",
    "@react-navigation/bottom-tabs": "^6.6.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "~3.31.0",

    "// Storage & State": "",
    "@react-native-async-storage/async-storage": "1.23.0",

    "// API": "",
    "axios": "^1.6.0",

    "// Platform APIs": "",
    "expo-location": "~17.0.0",
    "expo-auth-session": "~5.5.0",
    "expo-web-browser": "~13.0.0",

    "// Maps": "",
    "react-native-maps": "1.14.0",
    "// OR": "",
    "@maplibre/maplibre-react-native": "^10.0.0",

    "// UI & Icons": "",
    "react-native-svg": "15.2.0",
    "@tabler/icons-react-native": "^3.0.0",

    "// Utilities": "",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@testing-library/react-native": "^12.0.0",
    "@types/react": "~18.2.45",
    "typescript": "~5.3.0",
    "eslint": "^8.57.0",
    "prettier": "^3.0.0"
  }
}
```

---

### Learning Resources

**React Native**:
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation Docs](https://reactnavigation.org/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)

**Specific Topics**:
- [React Native Layout](https://reactnative.dev/docs/flexbox)
- [FlatList Performance](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)

**Videos**:
- React Native for Web Developers
- Building Production React Native Apps
- React Navigation Deep Dive

---

### Key Differences: Web vs Mobile

| Aspect | Web (React) | Mobile (React Native) |
|--------|-------------|----------------------|
| **Elements** | HTML (div, span, button) | Primitives (View, Text, Pressable) |
| **Styling** | CSS, TailwindCSS | StyleSheet objects |
| **Navigation** | react-router-dom | React Navigation |
| **Layout** | CSS Flexbox, Grid | Flexbox only |
| **Scrolling** | Browser native | ScrollView, FlatList |
| **Storage** | localStorage | AsyncStorage |
| **Images** | `<img src>` | `<Image source={{uri}}>` |
| **Forms** | HTML forms | TextInput + manual handling |
| **Events** | onClick, onChange | onPress, onChangeText |
| **Platform APIs** | Browser APIs | Expo/Native modules |

---

### Success Metrics

**Development**:
- [ ] Authentication works on both platforms
- [ ] All main features working
- [ ] No crashes in normal use
- [ ] Performance is smooth (60fps scrolling)
- [ ] App size < 50MB

**User Experience**:
- [ ] App launch < 3 seconds
- [ ] Check-in flow < 30 seconds
- [ ] Location accuracy within 50m
- [ ] All touch targets > 44x44pt

**Quality**:
- [ ] Test coverage > 60%
- [ ] Zero critical bugs
- [ ] Passes app store review
- [ ] Works offline (gracefully degrades)

---

## Conclusion

Converting FourMore from a React web app to React Native is a **medium-to-large effort** (4-8 weeks) with significant UI work but good business logic reuse. The recommended approach is **React Native with Expo** for best balance of native quality and development speed.

**Key Takeaways**:
1. ~75% of code needs rewriting (all UI)
2. ~25% of code is reusable (API, types, logic)
3. Most complex parts: Maps, OAuth, Navigation
4. Estimated timeline: 4-8 weeks for full feature parity
5. Alternative: PWA for faster but less native result

**Next Steps**:
1. Decide on approach (React Native recommended)
2. Set up development environment
3. Start with Phase 1 (authentication)
4. Build incrementally and test often
5. Launch MVP, iterate based on feedback

Good luck with the migration!
