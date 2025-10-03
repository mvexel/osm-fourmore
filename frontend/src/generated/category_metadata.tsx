// This file is auto-generated from category_mapping.json
// Do not edit by hand. Update category_mapping.json and run generate_category_ts.py

import type { ComponentProps } from 'react'
import {
  IconBallFootball,
  IconBed,
  IconBeer,
  IconBread,
  IconBriefcase,
  IconBuilding,
  IconBuildingBank,
  IconBuildingChurch,
  IconBuildingFactory,
  IconBuildingMonument,
  IconBurger,
  IconBus,
  IconCoffee,
  IconDeviceGamepad2,
  IconFirstAidKit,
  IconGasStation,
  IconPalette,
  IconParking,
  IconPaw,
  IconMapPinQuestion,
  IconSchool,
  IconScissors,
  IconShoppingBag,
  IconShoppingCart,
  IconToolsKitchen2,
  IconTrees,
  IconUsers,
} from '@tabler/icons-react'

type IconProps = Partial<ComponentProps<typeof IconBallFootball>>
type IconComponent = typeof IconBallFootball

export type CategoryKey = 'restaurant' | 'cafe_bakery' | 'bar_pub' | 'fast_food' | 'grocery' | 'specialty_food' | 'retail' | 'personal_services' | 'professional_services' | 'finance' | 'lodging' | 'transport' | 'auto_services' | 'parking' | 'healthcare' | 'education' | 'government' | 'community' | 'religious' | 'culture' | 'entertainment' | 'sports_fitness' | 'parks_outdoors' | 'landmark' | 'animal_services' | 'industrial' | 'misc'

type CategoryMeta = { label: string; Icon: IconComponent }

export const CATEGORY_META = {
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
  misc: { label: 'Other', Icon: IconMapPinQuestion },
} as const

export const LEGACY_AMENITY_TO_CATEGORY: Record<string, CategoryKey> = {
  'airport': 'transport',
  'ambulance_station': 'healthcare',
  'amusement_arcade': 'entertainment',
  'animal_boarding': 'animal_services',
  'animal_shelter': 'animal_services',
  'arts_centre': 'culture',
  'atm': 'finance',
  'bank': 'finance',
  'bar': 'bar_pub',
  'bbq': 'restaurant',
  'beauty_salon': 'personal_services',
  'bicycle_parking': 'parking',
  'biergarten': 'bar_pub',
  'bowling_alley': 'entertainment',
  'bureau_de_change': 'finance',
  'bus_station': 'transport',
  'bus_terminal': 'transport',
  'cafe': 'cafe_bakery',
  'car_rental': 'auto_services',
  'car_repair': 'auto_services',
  'car_sharing': 'auto_services',
  'car_wash': 'auto_services',
  'casino': 'entertainment',
  'chapel': 'religious',
  'charging_station': 'auto_services',
  'church': 'religious',
  'cinema': 'entertainment',
  'clinic': 'healthcare',
  'coffee_shop': 'cafe_bakery',
  'college': 'education',
  'community_centre': 'community',
  'concert_hall': 'culture',
  'conference_centre': 'professional_services',
  'courthouse': 'government',
  'coworking_space': 'professional_services',
  'cultural_center': 'culture',
  'customs': 'government',
  'dentist': 'healthcare',
  'diner': 'restaurant',
  'doctor': 'healthcare',
  'doctors': 'healthcare',
  'dry_cleaning': 'personal_services',
  'embassy': 'government',
  'events_centre': 'community',
  'fast_food': 'fast_food',
  'ferry_terminal': 'transport',
  'fire_station': 'government',
  'food_court': 'restaurant',
  'food_truck': 'fast_food',
  'fountain': 'landmark',
  'fuel': 'auto_services',
  'hairdresser': 'personal_services',
  'hospital': 'healthcare',
  'ice_cream': 'fast_food',
  'kindergarten': 'education',
  'language_school': 'education',
  'laundry': 'personal_services',
  'library': 'education',
  'marketplace': 'grocery',
  'money_transfer': 'finance',
  'mosque': 'religious',
  'motorcycle_parking': 'parking',
  'music_school': 'education',
  'nightclub': 'entertainment',
  'parking': 'parking',
  'parking_entrance': 'parking',
  'parking_space': 'parking',
  'pharmacy': 'healthcare',
  'picnic_table': 'parks_outdoors',
  'place_of_worship': 'religious',
  'planetarium': 'culture',
  'police': 'government',
  'post_office': 'government',
  'pub': 'bar_pub',
  'public_bath': 'community',
  'restaurant': 'restaurant',
  'sauna': 'personal_services',
  'school': 'education',
  'shelter': 'community',
  'shrine': 'religious',
  'social_centre': 'community',
  'social_facility': 'community',
  'soup_kitchen': 'community',
  'spa': 'personal_services',
  'street_vendor': 'fast_food',
  'stripclub': 'entertainment',
  'synagogue': 'religious',
  'tea': 'cafe_bakery',
  'temple': 'religious',
  'theatre': 'culture',
  'townhall': 'government',
  'university': 'education',
  'vehicle_inspection': 'auto_services',
  'veterinary': 'animal_services',
  'youth_centre': 'community',
}

export const LEGACY_SHOP_TO_CATEGORY: Record<string, CategoryKey> = {
  'bakery': 'specialty_food',
  'beauty': 'personal_services',
  'books': 'retail',
  'butcher': 'specialty_food',
  'car': 'retail',
  'car_accessories': 'retail',
  'car_parts': 'auto_services',
  'car_repair': 'auto_services',
  'caravan': 'auto_services',
  'cheese': 'specialty_food',
  'chocolate': 'specialty_food',
  'clothes': 'retail',
  'coffee': 'specialty_food',
  'computer': 'retail',
  'confectionery': 'specialty_food',
  'convenience': 'grocery',
  'cosmetics': 'personal_services',
  'deli': 'specialty_food',
  'department_store': 'retail',
  'doityourself': 'retail',
  'electronics': 'retail',
  'fashion': 'retail',
  'fishmonger': 'specialty_food',
  'frozen_food': 'specialty_food',
  'furniture': 'retail',
  'general': 'retail',
  'gift': 'retail',
  'greengrocer': 'specialty_food',
  'grocery': 'grocery',
  'hairdresser': 'personal_services',
  'hardware': 'retail',
  'health_food': 'specialty_food',
  'interior_decoration': 'retail',
  'jewelry': 'retail',
  'laundry': 'personal_services',
  'mall': 'retail',
  'marketplace': 'grocery',
  'massage': 'personal_services',
  'motorcycle': 'auto_services',
  'organic': 'specialty_food',
  'pastry': 'specialty_food',
  'pet': 'animal_services',
  'pet_grooming': 'animal_services',
  'shoes': 'retail',
  'stationery': 'retail',
  'supermarket': 'grocery',
  'tailor': 'personal_services',
  'tea': 'specialty_food',
  'toys': 'retail',
  'tyres': 'auto_services',
  'variety_store': 'retail',
}

const DEFAULT_META: CategoryMeta = { label: 'Other', Icon: IconBallFootball }

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
    return { label: meta.label, Icon: meta.Icon }
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
