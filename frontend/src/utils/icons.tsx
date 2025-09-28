import type { ComponentProps } from 'react'
import {
  IconToolsKitchen2,
  IconShoppingBag,
  IconDeviceGamepad2,
  IconFirstAidKit,
  IconSchool,
  IconBuildingBank,
  IconGasStation,
  IconBallFootball,
  IconBuilding,
  IconBuildingChurch,
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
  IconCoffee,
  IconBeer,
  IconBurger,
  IconShoppingCart,
  IconBread,
  IconScissors,
  IconBriefcase,
  IconBed,
  IconBus,
  IconParking,
  IconUsers,
  IconPalette,
  IconTrees,
  IconPaw,
  IconBuildingFactory,
  IconQuestionMark,
} from '@tabler/icons-react'

type IconProps = Partial<ComponentProps<typeof IconMapPin>>

type IconComponent = typeof IconMapPin

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const CATEGORY_META = {
  restaurant: { label: 'Restaurants', Icon: IconToolsKitchen2 },
  cafe_bakery: { label: 'Cafes & Bakeries', Icon: IconCoffee },
  bar_pub: { label: 'Bars & Pubs', Icon: IconBeer },
  fast_food: { label: 'Fast Food', Icon: IconBurger },
  grocery: { label: 'Grocery & Markets', Icon: IconShoppingCart },
  specialty_food: { label: 'Specialty Food', Icon: IconBread },
  retail: { label: 'Shops & Retail', Icon: IconShoppingBag },
  personal_services: { label: 'Personal Services', Icon: IconScissors },
  professional_services: { label: 'Professional Services', Icon: IconBriefcase },
  finance: { label: 'Financial Services', Icon: IconBuildingBank },
  lodging: { label: 'Lodging & Camping', Icon: IconBed },
  transport: { label: 'Transit & Travel', Icon: IconBus },
  auto_services: { label: 'Auto Services', Icon: IconGasStation },
  parking: { label: 'Parking', Icon: IconParking },
  healthcare: { label: 'Healthcare', Icon: IconFirstAidKit },
  education: { label: 'Education', Icon: IconSchool },
  government: { label: 'Government & Civic', Icon: IconBuilding },
  community: { label: 'Community & Social', Icon: IconUsers },
  religious: { label: 'Religious', Icon: IconBuildingChurch },
  culture: { label: 'Culture & Arts', Icon: IconPalette },
  entertainment: { label: 'Entertainment', Icon: IconDeviceGamepad2 },
  sports_fitness: { label: 'Sports & Fitness', Icon: IconBallFootball },
  parks_outdoors: { label: 'Parks & Outdoors', Icon: IconTrees },
  landmark: { label: 'Landmarks', Icon: IconBuildingMonument },
  animal_services: { label: 'Animal Services', Icon: IconPaw },
  industrial: { label: 'Industrial & Utility', Icon: IconBuildingFactory },
  misc: { label: 'Other', Icon: IconQuestionMark },
} as const
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

type CategoryKey = keyof typeof CATEGORY_META
type CategoryMeta = { label: string; Icon: IconComponent }

const LEGACY_AMENITY_TO_CATEGORY: Record<string, CategoryKey> = {
  restaurant: 'restaurant',
  cafe: 'cafe_bakery',
  coffee_shop: 'cafe_bakery',
  bar: 'bar_pub',
  pub: 'bar_pub',
  biergarten: 'bar_pub',
  fast_food: 'fast_food',
  food_court: 'restaurant',
  bank: 'finance',
  atm: 'finance',
  bureau_de_change: 'finance',
  money_transfer: 'finance',
  hospital: 'healthcare',
  clinic: 'healthcare',
  doctor: 'healthcare',
  doctors: 'healthcare',
  dentist: 'healthcare',
  pharmacy: 'healthcare',
  school: 'education',
  kindergarten: 'education',
  college: 'education',
  university: 'education',
  library: 'education',
  fuel: 'auto_services',
  charging_station: 'auto_services',
  car_wash: 'auto_services',
  car_repair: 'auto_services',
  vehicle_inspection: 'auto_services',
  parking: 'parking',
  bicycle_parking: 'parking',
  motorcycle_parking: 'parking',
  place_of_worship: 'religious',
  theatre: 'culture',
  cinema: 'entertainment',
  nightclub: 'entertainment',
  casino: 'entertainment',
  police: 'government',
  fire_station: 'government',
  post_office: 'government',
  townhall: 'government',
  community_centre: 'community',
  social_facility: 'community',
  arts_centre: 'culture',
  museum: 'culture',
  gallery: 'culture',
  hotel: 'lodging',
  hostel: 'lodging',
  guest_house: 'lodging',
  ferry_terminal: 'transport',
  bus_station: 'transport',
}

const LEGACY_SHOP_TO_CATEGORY: Record<string, CategoryKey> = {
  supermarket: 'grocery',
  convenience: 'grocery',
  grocery: 'grocery',
  bakery: 'specialty_food',
  butcher: 'specialty_food',
  cheese: 'specialty_food',
  confectionery: 'specialty_food',
  fishmonger: 'specialty_food',
  frozen_food: 'specialty_food',
  greengrocer: 'specialty_food',
  organic: 'specialty_food',
  pastry: 'specialty_food',
  tea: 'specialty_food',
  coffee: 'specialty_food',
  mall: 'retail',
  department_store: 'retail',
  clothes: 'retail',
  fashion: 'retail',
  shoes: 'retail',
  electronics: 'retail',
  computer: 'retail',
  hardware: 'retail',
  doityourself: 'retail',
  furniture: 'retail',
  jewelry: 'retail',
  toys: 'retail',
  books: 'retail',
  gift: 'retail',
  cosmetics: 'personal_services',
  hairdresser: 'personal_services',
  beauty: 'personal_services',
  massage: 'personal_services',
  laundry: 'personal_services',
  tailor: 'personal_services',
}

const DEFAULT_META: { label: string; Icon: IconComponent } = { label: 'Other', Icon: IconMapPin }

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const humanize = (value: string) =>
  value
    .replace(/^amenity_/, '')
    .replace(/^shop_/, '')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(' ')

const hasCategoryMeta = (className: string): className is CategoryKey =>
  Object.prototype.hasOwnProperty.call(CATEGORY_META, className)

const normalizeClassName = (className: string | undefined): string | undefined => {
  if (!className) {
    return undefined
  }

  if (hasCategoryMeta(className)) {
    return className
  }

  if (className.startsWith('amenity_')) {
    const amenityType = className.replace('amenity_', '')
    return LEGACY_AMENITY_TO_CATEGORY[amenityType] ?? className
  }

  if (className.startsWith('shop_')) {
    const shopType = className.replace('shop_', '')
    return LEGACY_SHOP_TO_CATEGORY[shopType] ?? className
  }

  return className
}

const getCategoryMeta = (className: string | undefined): CategoryMeta | undefined => {
  const normalized = normalizeClassName(className)
  if (normalized && hasCategoryMeta(normalized)) {
    const meta = CATEGORY_META[normalized]
    return { label: meta.label, Icon: meta.Icon as IconComponent }
  }
  return undefined
}

export const getCategoryIcon = (className: string, props: IconProps = {}) => {
  const { size = 20, className: cssClass = '', color } = props
  const iconProps: IconProps = { size, className: cssClass, color }

  const meta = getCategoryMeta(className)
  const IconComponent: IconComponent = meta?.Icon ?? DEFAULT_META.Icon

  return <IconComponent {...iconProps} />
}

export const getCategoryLabel = (className: string | undefined) => {
  if (!className) {
    return DEFAULT_META.label
  }

  const meta = getCategoryMeta(className)

  if (meta) {
    return meta.label
  }

  if (className === 'misc') {
    return DEFAULT_META.label
  }

  return humanize(className)
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
