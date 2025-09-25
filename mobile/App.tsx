import { StatusBar } from 'expo-status-bar'
import { AppNavigator } from './src/navigation/AppNavigator'
import { initializeStorage } from '@fourmore/shared'
import { mobileStorage } from './src/utils/storage'

// Initialize shared API with mobile storage
initializeStorage(mobileStorage)

export default function App() {
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  )
}
