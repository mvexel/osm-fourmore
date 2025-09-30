import type { ComponentProps } from 'react'
import {
  IconMapPin,
  IconPhone,
  IconWorld,
  IconCheck,
  IconClock,
  IconMap,
  IconConfetti,
  IconMoodSad,
  IconBulb,
  IconHome,
  IconHistory,
  IconUser,
  IconLock,
  IconExternalLink,
  IconPencil,
  IconInfoCircle,
  IconHeart,
  IconHeartFilled,
} from '@tabler/icons-react'

// Import the generated category metadata
import {
  getCategoryIcon as getGeneratedCategoryIcon,
  getCategoryLabel as getGeneratedCategoryLabel,
  type CategoryKey,
} from '../generated/category_metadata'

type IconProps = Partial<ComponentProps<typeof IconMapPin>>

// Re-export the generated functions with the same names for backward compatibility
export const getCategoryIcon = getGeneratedCategoryIcon
export const getCategoryLabel = getGeneratedCategoryLabel

// Export the CategoryKey type for TypeScript users
export type { CategoryKey }

// Contact and UI icons (unchanged)
export const ContactIcons = {
  location: (props: IconProps = {}) => <IconMapPin {...props} />,
  phone: (props: IconProps = {}) => <IconPhone {...props} />,
  website: (props: IconProps = {}) => <IconWorld {...props} />,
  hours: (props: IconProps = {}) => <IconClock {...props} />,
  map: (props: IconProps = {}) => <IconMap {...props} />,
}

// UI state icons (unchanged)
export const UIIcons = {
  success: (props: IconProps = {}) => <IconConfetti {...props} />,
  checked_in: (props: IconProps = {}) => <IconCheck {...props} />,
  error: (props: IconProps = {}) => <IconMoodSad {...props} />,
  idea: (props: IconProps = {}) => <IconBulb {...props} />,
  secure: (props: IconProps = {}) => <IconLock {...props} />,
}

export const ActionIcons = {
  external: (props: IconProps = {}) => <IconExternalLink {...props} />,
  edit: (props: IconProps = {}) => <IconPencil {...props} />,
  info: (props: IconProps = {}) => <IconInfoCircle {...props} />,
  favorite: (props: IconProps = {}) => <IconHeart {...props} />,
  favoriteFilled: (props: IconProps = {}) => <IconHeartFilled {...props} />,
}

// Navigation icons (unchanged)
export const NavIcons = {
  nearby: (props: IconProps = {}) => <IconMapPin {...props} />,
  history: (props: IconProps = {}) => <IconHistory {...props} />,
  profile: (props: IconProps = {}) => <IconUser {...props} />,
  home: (props: IconProps = {}) => <IconHome {...props} />,
}