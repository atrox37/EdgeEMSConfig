/**
 * Icons available for Home Configuration points.
 * Used by PointConfigDialog selector and HomeView for display.
 */

import iconPvEnergy from '@/assets/icons/icon-pv-energy.svg'
import iconDieselEnergy from '@/assets/icons/icon-diesel-energy.svg'
import iconEnergyUsed from '@/assets/icons/icon-energy-used.svg'
import iconSavingBilling from '@/assets/icons/icon-saving-billing.svg'
import iconEssEnergy from '@/assets/icons/icon-ess-energy.svg'

export const AVAILABLE_ICONS = [
  { name: 'icon-pv-energy', label: 'PV Energy', url: iconPvEnergy },
  { name: 'icon-diesel-energy', label: 'Diesel Energy', url: iconDieselEnergy },
  { name: 'icon-energy-used', label: 'Energy Used', url: iconEnergyUsed },
  { name: 'icon-saving-billing', label: 'Saving Billing', url: iconSavingBilling },
  { name: 'icon-ess-energy', label: 'ESS Energy', url: iconEssEnergy },
] as const

export type IconName = (typeof AVAILABLE_ICONS)[number]['name']

const LEGACY_ICON_NAME_MAP: Record<string, IconName> = {
  PVEnergy: 'icon-pv-energy',
  DieselEnergy: 'icon-diesel-energy',
  EnergyUsed: 'icon-energy-used',
  SavingBilling: 'icon-saving-billing',
  ESSEnergy: 'icon-ess-energy',
  'ioon-pv-energy': 'icon-pv-energy',
  'ioon-diesel-energy': 'icon-diesel-energy',
  'ioon-energy-used': 'icon-energy-used',
  'ioon-saving-billing': 'icon-saving-billing',
  'ioon-ess-energy': 'icon-ess-energy',
}

export function getIconUrl(name: string): string | undefined {
  const normalized = (LEGACY_ICON_NAME_MAP[name] ?? name) as string
  return AVAILABLE_ICONS.find((i) => i.name === normalized)?.url
}
