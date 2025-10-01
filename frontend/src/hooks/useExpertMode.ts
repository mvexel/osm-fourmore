import { useAuth } from './useAuth'

/**
 * Hook to check if the current user has expert mode enabled.
 * Returns false if user is not authenticated or expert mode is not set.
 */
export function useExpertMode(): boolean {
  const { user } = useAuth()
  return user?.settings?.expert ?? false
}
