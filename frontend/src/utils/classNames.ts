/**
 * Shared CSS class constants for consistent styling across the app
 */

// Button Classes
export const BUTTON_BASE = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500'
export const BUTTON_PRIMARY = 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
export const BUTTON_SECONDARY = 'bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
export const BUTTON_DANGER = 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
export const BUTTON_FULL_WIDTH = 'w-full py-3'

// Card Classes
export const CARD_BASE = 'bg-white border border-gray-200 rounded-lg'
export const CARD_PADDING = 'p-4'
export const CARD_PADDING_LG = 'p-6'
export const CARD_SHADOW = 'shadow-sm hover:shadow-md transition-shadow'

// Info Box Classes
export const INFO_BOX_BASE = 'p-4 rounded-lg border'
export const INFO_BOX_SUCCESS = 'bg-green-50 border-green-200 text-green-800'
export const INFO_BOX_ERROR = 'bg-red-50 border-red-200 text-red-800'
export const INFO_BOX_WARNING = 'bg-yellow-50 border-yellow-200 text-yellow-800'
export const INFO_BOX_INFO = 'bg-blue-50 border-blue-200 text-blue-800'

// Input Classes
export const INPUT_BASE = 'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
export const INPUT_FULL_WIDTH = 'w-full'

// Text Classes
export const TEXT_PRIMARY = 'text-gray-900'
export const TEXT_SECONDARY = 'text-gray-700'
export const TEXT_TERTIARY = 'text-gray-600'
export const TEXT_MUTED = 'text-gray-500'
export const TEXT_LINK = 'text-primary-600 hover:text-primary-700 transition-colors'

// Layout Classes
export const HEADER_STICKY = 'sticky top-0 bg-white border-b border-gray-200 p-4 z-10'
export const FLEX_CENTER = 'flex items-center justify-center'
export const FLEX_BETWEEN = 'flex items-center justify-between'

// Icon Classes
export const ICON_DEFAULT = 'text-gray-600'
export const ICON_MUTED = 'text-gray-400'
export const ICON_PRIMARY = 'text-primary-600'

/**
 * Helper function to combine class names
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
