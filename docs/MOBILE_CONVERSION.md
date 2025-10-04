# FourMore Mobile Conversion Implementation Guide

**Last updated**: 2025-10-03  
**Primary audience**: Solo developer (plus potential volunteer) delivering the native mobile app.  
**Assumed target stack**: React Native 0.74 + Expo SDK 51, React 18, TypeScript 5.x, React Navigation 7, Expo Application Services (EAS) for builds and updates.

---

## Working Premises
- Current mobile web app lives in `frontend/` (React + Vite) with TypeScript domain models and axios-based API client hitting the FastAPI backend.
- Backend already exposes REST endpoints with JWT auth and OAuth login flow (likely OSM). No mobile-specific endpoints required beyond deep-link URI registration and CORS tweaks.
- Web and future mobile clients should share schema types, API contracts, and business logic to reduce drift.
- Expo managed workflow is the default; eject only if a required native module cannot be satisfied via config plugins.

---

## Tooling & Repository Layout

### Proposed directory structure additions
```
root/
├─ mobile/                 # Expo-managed React Native project
├─ packages/
│  └─ fourmore-core/       # Shared TypeScript domain + API client
├─ frontend/               # Existing web client consumes fourmore-core
└─ docs/
   └─ MOBILE_CONVERSION.md
```

### Package management
- Use pnpm or yarn workspaces to manage `frontend/`, `mobile/`, and `packages/` together; pnpm recommended for disk efficiency.
- Add a `pnpm-workspace.yaml` covering `frontend`, `mobile`, `packages/*`.
- Configure TypeScript path aliases so both frontend and mobile resolve shared types via `@fourmore/core`.

### Development scripts
- Add root-level scripts (e.g., via `package.json` or Make targets) for common tasks: `pnpm mobile:start`, `pnpm mobile:lint`, `pnpm core:build`.
- Keep FastAPI backend workflow unchanged; mobile dev requires the same backend running locally or pointing to staging.

---

## Shared Core Module (`packages/fourmore-core`)

### Purpose
- Centralize API DTOs, axios configuration, validation helpers, and business logic hooks that are UI-agnostic.
- Provide swappable adapters so storage, navigation, or device-specific features can differ between web and native.

### Implementation steps
1. Create `packages/fourmore-core/package.json` with module/exports definitions targeting ESM.
2. Move `frontend/src/types` into `packages/fourmore-core/src/types` and convert relative imports accordingly.
3. Refactor `frontend/src/services/api.ts` into reusable pieces:
   - `createApiClient(config: ApiClientConfig)` returning axios instance.
   - `authClient`, `placesClient`, etc., exporting functions that accept the axios instance.
   - Replace direct `localStorage` calls with an injected `TokenStore` interface (`getToken()`, `setToken()`, `clear()`).
4. Provide default implementations:
   - Web: thin wrapper around `localStorage`.
   - Mobile: AsyncStorage implementation lives inside the mobile app and is passed in during initialization.
5. Export pure helper hooks (e.g., data fetching logic) but avoid coupling to React state management; prefer simple functions returning promises or objects so each app can choose React Query/Zustand/etc.
6. Add TypeScript build step (`tsup` or `tsc --emitDeclarationOnly`) to output type declarations consumed by both clients.
7. Update `frontend/` imports to pull from `@fourmore/core` and verify existing app continues to build.

---

## Mobile Project Setup (`mobile/`)

### Initialization
1. Run `npx create-expo-app mobile --template` (choose minimal TypeScript template or Expo Router template if file-based routing desired).
2. Inside `mobile`, install workspace dependencies:
   ```bash
   pnpm add react-native-reanimated@^3.9 react-native-gesture-handler@^2.16
   pnpm add @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
   pnpm add @react-navigation/drawer react-native-safe-area-context react-native-screens
   pnpm add @react-native-async-storage/async-storage
   pnpm add axios expo-auth-session expo-secure-store expo-web-browser
   pnpm add expo-location expo-task-manager expo-device expo-application
   pnpm add react-native-maps (or @rnmapbox/maps if committing to MapLibre early)
   pnpm add nativewind tailwindcss --filter mobile
   pnpm add @fourmore/core --filter mobile
   ```
3. Configure Expo plugins in `app.json`:
   - Add custom URL scheme `fourmore`.
   - Configure `expo-auth-session` redirect settings.
   - Register location usage descriptions for iOS and Android.
4. Initialize NativeWind: create `tailwind.config.js` in `mobile/`, map design tokens to match existing web palette.
5. Set up TypeScript path aliases in `tsconfig.json` pointing to `@fourmore/core` source for local development.

### Workspace wiring
- Ensure `mobile/metro.config.js` uses `withExpo` and resolves symlinked packages (e.g., `@fourmore/core`).
- Add `babel.config.js` plugin entries for NativeWind and Reanimated (`"nativewind/babel", "react-native-reanimated/plugin"`).
- Configure ESLint with React Native community preset plus project-specific rules (mirroring web as feasible).

### Continuous development
- Use `expo start --dev-client` for local development to allow custom native modules if needed.
- Install Expo Go on devices for quick testing; move to dev client builds once native modules beyond Expo Go support are required (e.g., `react-native-maps`).

---

## Application Architecture Overview

### Navigation
- Use React Navigation with three main stacks:
  1. **Auth stack**: `LoginScreen`, `AuthCallbackScreen`.
  2. **App shell**: bottom tab navigator hosting `Nearby`, `CheckIns`, `Profile` top-level routes.
  3. **Modal/Details stack**: `PlaceDetails`, `QuestDialog`, `MapFullScreen` presented modally.
- Configure deep linking to support `fourmore://auth/callback?code=...` and optional shareable place links (`fourmore://places/:osmType/:osmId`).

### State and data layer
- Use React Query (TanStack Query) for caching to simplify async flows and offline persistence via `persistQueryClient` + AsyncStorage.
- Manage auth state in a context wrapping React Query so tokens and user profiles are available globally.
- Keep domain logic (transformations, validation) inside `@fourmore/core`; UI layer handles user interactions and form state.

### Styling
- Adopt NativeWind to translate Tailwind-like classes to React Native styles; define shared color palette and spacing scales.
- Create reusable UI primitives (`Button`, `Card`, `Typography`, `ScreenContainer`) to standardize styling and reduce duplication.

### Error handling & logging
- Centralize API error boundaries; display toast/snackbar feedback using `react-native-toast-message` or Expo’s `Haptics` + custom component.
- Integrate Sentry once the app stabilizes; Expo provides config plugin for quick setup.

---

## Feature Implementation Playbook

### Authentication & Session Persistence
- Implement `AuthProvider` using `expo-auth-session` with PKCE. Flow:
  1. User taps “Sign in with OSM”.
  2. Trigger `startAsync` with authorization endpoint.
  3. On redirect (`fourmore://auth/callback`), exchange code for token via shared `authClient.handleCallback`.
  4. Store token and user profile in AsyncStorage through `TokenStore` adapter.
  5. Rehydrate auth state on app launch before rendering the main navigator.
- Handle token expiration by intercepting 401 responses, clearing state, and redirecting to the auth stack.

### Nearby Places
- Use `FlashList` (Shopify) for performant list rendering with 60fps on low-end devices.
- Fetch initial data via React Query; implement infinite scroll using `useInfiniteQuery` and backend pagination.
- Provide map preview row component leveraging `react-native-maps` with clustering if necessary (`@gorhom/cluster`).
- Cache last known location to minimize spinners; request permissions only when needed.

### Place Details & Quests
- Build detail screen that requests place data, quests, and map snapshot concurrently.
- Use collapsible header showing map, hero image, and key metadata.
- For quest interactions, reuse shared core API; show guard rails (confirm dialogs) before sending contributions.
- Persist partially completed quest responses locally to survive app restarts.

### Check-ins & History
- Create check-in mutation hook that queues requests when offline. Strategy:
  - Write to local queue in AsyncStorage.
  - Attempt immediate POST; on failure due to network, mark pending.
  - Background sync job (using `expo-task-manager`) flushes queue when connectivity returns.
- Display history with pagination; allow pull-to-refresh to force refetch.
- Provide share/export capability using `expo-sharing` to replace browser download flow.

### Profile & Settings
- Reuse backend endpoints for stats and user settings.
- Ensure account deletion flow meets store requirements (confirmation, irreversible message).
- Offer opt-in toggle for location/background tasks and push notifications stored via shared settings API.

### Map Handling
- Initial choice: `react-native-maps` with Google/Apple basemaps for velocity.
- Add optional custom tile overlay referencing FourMore/OSM styling via `UrlTile` once performance validated.
- Provide user location indicator, re-center button, and fallback list view when map unavailable.
- Explore MapLibre Native once Expo config plugin compatibility confirmed (likely requires `expo prebuild`).

### Notifications (post-MVP)
- Integrate Expo Notifications for push; store Expo push tokens via backend endpoint for targeted messaging.
- Handle permission prompts contextually (e.g., after first successful check-in).

### Accessibility & Internationalization
- Use React Native accessibility props, ensure labels exist for interactive elements.
- Maintain existing English copy initially; plan for i18n once stable.

---

## Backend & Infrastructure Adjustments
- Register mobile redirect URIs (`fourmore://auth/callback`, optional universal link `https://fourmore.app/auth/callback`).
- Update OAuth app settings (OSM or other provider) to include bundle IDs (`app.fourmore.mobile` for iOS, `app.fourmore.mobile` for Android).
- Adjust FastAPI CORS configuration to allow custom schemes if required for deep linking handshake (often not necessary, but confirm).
- Provide endpoint for registering Expo push tokens (`POST /notifications/token`).
- Review rate limits and timeout settings; mobile networks may need longer timeouts for resource-heavy endpoints.

---

## Testing & Quality Strategy
- **Unit tests**: Use Jest + React Native Testing Library for components, and vitest (or Jest) for shared core functions.
- **Integration tests**: Mock location services with Expo’s testing utilities; assert navigation flows.
- **End-to-end**: Automate with Maestro (lightweight YAML workflows) for login, nearby browse, check-in, and settings flows on both iOS and Android.
- **Manual device matrix**: Maintain checklist for iPhone 13+, Pixel 6 class device, and low-end Android (Moto G series) per release candidate.
- **Performance checks**: Use Expo Performance Monitor and Flipper to track frames per second, memory usage, and network calls during map-heavy sessions.

---

## Release & Operations
- Configure EAS Build profiles:
  - `development`: dev client for simulator/device testing.
  - `preview`: internal distribution builds (TestFlight, Play Internal Testing).
  - `production`: store-ready.
- Use EAS Update for over-the-air JS bundle updates; set rollout percentage and monitor Sentry for regressions before expanding.
- Prepare store assets: icon, splash screen, privacy policy URL, screenshots (capture via Expo CLI + design overlays).
- Complete Apple App Store privacy nutrition labels and Google Play data safety questionnaire citing location usage and account deletion flow.

---

## Detailed Step-by-Step Execution Plan

| Step | Description | Output | Est. Effort |
| --- | --- | --- | --- |
| 1 | Convert repo into pnpm workspace; introduce `packages/fourmore-core` scaffold | Workspace config committed | 0.5 day |
| 2 | Migrate TypeScript types and API client into `fourmore-core`; update web imports | Shared package build passes; web app still works | 1.5 days |
| 3 | Scaffold Expo app in `mobile/`; configure NativeWind, React Navigation, AsyncStorage adapters | Expo project builds on simulator | 1 day |
| 4 | Implement shared auth storage adapter and bootstrap screen ensuring token rehydration | Stable auth context with loading gate | 1 day |
| 5 | Wire OAuth flow using `expo-auth-session`; confirm redirect and token exchange | Login/logout loop verified on iOS + Android dev clients | 2 days |
| 6 | Build base navigation (auth stack + tab navigator + detail modal) | Navigators functioning with placeholder screens | 1 day |
| 7 | Implement Nearby list using React Query + FlashList + location permission handling | Nearby screen shows real data | 2 days |
| 8 | Create map component (react-native-maps) with clustering toggle and location puck | Map renders markers, handles gestures smoothly | 2 days |
| 9 | Implement Place Details with quests, call-to-actions, offline placeholder caching | Detail screen feature-complete | 3 days |
| 10 | Build Check-in flow with offline queue and history list aggregated via React Query | Check-in operations reliable offline/online | 2.5 days |
| 11 | Flesh out Profile & Settings, including account deletion and preference toggles | Profile parity with web | 1.5 days |
| 12 | Add error handling, loading skeletons, toasts, and haptic feedback | Polished UX | 1 day |
| 13 | Integrate Sentry + analytics (optional) and ensure logging sanitized | Monitoring enabled | 1 day |
| 14 | Implement automated tests (unit + component) for critical flows | Test suite with ≥ 20 meaningful specs | 2 days |
| 15 | Set up Maestro E2E scripts, integrate into CI | Automated regression baseline | 1.5 days |
| 16 | Configure EAS build and submit to internal testing channels | TestFlight & Play testers onboarded | 1 day |
| 17 | Conduct manual QA, fix priority bugs, accessibility pass | Release candidate build | 2 days |
| 18 | Prepare store metadata/assets, complete compliance forms | Submission package ready | 1 day |
| 19 | Submit to stores, monitor review feedback, plan OTA rollout procedure | Approved release | varies |

> Adjust durations based on availability; solo developer may stretch steps 7–15 across multiple weeks. Volunteer can own discrete work chunks (maps, tests, documentation) once core scaffolding is ready.

---

## Task Backlog & Delegation Ideas

- **Core dev focus**:
  - Shared core package creation and maintenance.
  - Auth flow and navigation scaffolding.
  - Critical feature parity (Nearby, Place details, Check-ins).
- **Volunteer-friendly tasks** (modular, lower risk):
  1. Implement NativeWind component library and theming tokens.
  2. Build Profile/Settings UI once APIs wired.
  3. Write testing library specs and Maestro scripts.
  4. Optimize map marker clustering and animations.
  5. Produce store screenshots and marketing copy.

---

## Reference Commands & Snippets

```bash
# Start mobile app in development
pnpm --filter mobile expo start --dev-client

# Build shared package (emit types only)
pnpm --filter @fourmore/core build

# Run mobile tests
pnpm --filter mobile test

# Build iOS development client
pnpm --filter mobile eas build --profile development --platform ios
```

```ts
// TokenStore interface (fourmore-core)
export interface TokenStore {
  getToken(): Promise<string | null>
  setToken(token: string): Promise<void>
  clear(): Promise<void>
}
```

```ts
// Mobile implementation snippet
import AsyncStorage from '@react-native-async-storage/async-storage'

export const asyncStorageTokenStore: TokenStore = {
  async getToken() {
    return AsyncStorage.getItem('fourmore_token')
  },
  async setToken(token) {
    await AsyncStorage.setItem('fourmore_token', token)
  },
  async clear() {
    await AsyncStorage.multiRemove(['fourmore_token', 'fourmore_user'])
  },
}
```

---

## Additional Resources
- Expo AuthSession Deep Linking Example — https://docs.expo.dev/guides/authentication/
- React Navigation Deep Linking Guide — https://reactnavigation.org/docs/deep-linking/
- FlashList Performance Tips — https://shopify.github.io/flash-list/docs/guides/performance
- Expo Location & Background Tasks — https://docs.expo.dev/versions/latest/sdk/location/
- Maestro Mobile E2E Testing — https://maestro.mobile.dev/

