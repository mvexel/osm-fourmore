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

export const getCategoryIcon = (className: string, props: IconProps = {}) => {
  const { size = 20, className: cssClass = '', color } = props
  const iconProps = { size, className: cssClass, color }

  // Handle osm2pgsql class names (e.g., 'amenity_restaurant', 'shop_supermarket')
  // Extract the base category for icon mapping
  if (className.includes('amenity_')) {
    const amenityType = className.replace('amenity_', '')
    switch (amenityType) {
      case 'restaurant':
      case 'cafe':
      case 'bar':
      case 'pub':
      case 'fast_food':
      case 'food_court':
        return <IconToolsKitchen2 {...iconProps} />
      case 'bank':
      case 'atm':
        return <IconBuildingBank {...iconProps} />
      case 'hospital':
      case 'clinic':
      case 'pharmacy':
      case 'dentist':
        return <IconFirstAidKit {...iconProps} />
      case 'school':
      case 'university':
      case 'college':
      case 'library':
        return <IconSchool {...iconProps} />
      case 'fuel':
      case 'parking':
      case 'car_wash':
      case 'car_repair':
        return <IconGasStation {...iconProps} />
      case 'place_of_worship':
        return <IconBuildingChurch {...iconProps} />
      case 'theatre':
      case 'cinema':
      case 'nightclub':
      case 'casino':
        return <IconDeviceGamepad2 {...iconProps} />
      case 'police':
      case 'fire_station':
      case 'post_office':
      case 'townhall':
        return <IconBuilding {...iconProps} />
      default:
        return <IconMapPin {...iconProps} />
    }
  }

  if (className.includes('shop_')) {
    const shopType = className.replace('shop_', '')
    switch (shopType) {
      case 'supermarket':
      case 'convenience':
      case 'department_store':
      case 'mall':
      case 'clothes':
      case 'shoes':
      case 'electronics':
      case 'books':
        return <IconShoppingBag {...iconProps} />
      case 'bakery':
      case 'butcher':
      case 'seafood':
        return <IconToolsKitchen2 {...iconProps} />
      case 'hairdresser':
      case 'beauty':
      case 'laundry':
        return <IconTool {...iconProps} />
      default:
        return <IconShoppingBag {...iconProps} />
    }
  }

  if (className.includes('tourism_')) {
    const tourismType = className.replace('tourism_', '')
    switch (tourismType) {
      case 'hotel':
      case 'motel':
      case 'hostel':
      case 'guest_house':
        return <IconBuildingStore {...iconProps} />
      case 'museum':
      case 'gallery':
      case 'zoo':
      case 'theme_park':
      case 'attraction':
      case 'viewpoint':
        return <IconBuildingMonument {...iconProps} />
      default:
        return <IconMapPin {...iconProps} />
    }
  }

  if (className.includes('leisure_')) {
    return <IconBallFootball {...iconProps} />
  }

  // Legacy category support (fallback)
  switch (className) {
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