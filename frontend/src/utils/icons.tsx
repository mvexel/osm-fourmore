import {
  IconToolsKitchen2,
  IconShoppingBag,
  IconDeviceGamepad2,
  IconFirstAidKit,
  IconSchool,
  IconBuildingBank,
  IconGasStation,
  IconBuildingStore,
  IconBallFootball,
  IconBuilding,
  IconBuildingChurch,
  IconTool,
  IconBuildingMonument,
  IconMapPin,
  IconPhone,
  IconWorld,
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

interface IconProps {
  size?: number
  className?: string
  color?: string
}

export const getCategoryIcon = (category: string, props: IconProps = {}) => {
  const { size = 20, className = '', color } = props
  const iconProps = { size, className, color }

  switch (category) {
    case 'food':
      return <IconToolsKitchen2 {...iconProps} />
    case 'retail':
      return <IconShoppingBag {...iconProps} />
    case 'entertainment':
      return <IconDeviceGamepad2 {...iconProps} />
    case 'healthcare':
      return <IconFirstAidKit {...iconProps} />
    case 'education':
      return <IconSchool {...iconProps} />
    case 'finance':
      return <IconBuildingBank {...iconProps} />
    case 'automotive':
      return <IconGasStation {...iconProps} />
    case 'accommodation':
      return <IconBuildingStore {...iconProps} />
    case 'recreation':
      return <IconBallFootball {...iconProps} />
    case 'government':
      return <IconBuilding {...iconProps} />
    case 'religion':
      return <IconBuildingChurch {...iconProps} />
    case 'services':
      return <IconTool {...iconProps} />
    case 'attractions':
      return <IconBuildingMonument {...iconProps} />
    default:
      return <IconMapPin {...iconProps} />
  }
}

// Contact and UI icons
export const ContactIcons = {
  location: (props: IconProps = {}) => <IconMapPin {...props} />,
  phone: (props: IconProps = {}) => <IconPhone {...props} />,
  website: (props: IconProps = {}) => <IconWorld {...props} />,
  hours: (props: IconProps = {}) => <IconClock {...props} />,
  map: (props: IconProps = {}) => <IconMap {...props} />,
}

// UI state icons
export const UIIcons = {
  success: (props: IconProps = {}) => <IconConfetti {...props} />,
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

// Navigation icons
export const NavIcons = {
  nearby: (props: IconProps = {}) => <IconMapPin {...props} />,
  history: (props: IconProps = {}) => <IconHistory {...props} />,
  profile: (props: IconProps = {}) => <IconUser {...props} />,
  home: (props: IconProps = {}) => <IconHome {...props} />,
}