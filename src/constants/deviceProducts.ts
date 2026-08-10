import type { ProductListItem } from '@/types/deviceConfiguration'
import type { ModelNodeTemplate } from '@/types/visualModeling'
import { getProductInstanceImageUrl } from '@/utils/productInstanceImages'

/**
 * 产品层级规范映射（以后端 /api/products 为准）。
 * Load 系列产品（Load, EVChargingLoad, HVACLoad, Load_Three_Phase）均为 Station 直接子设备，
 * 无独立 Load 容器节点。
 */
const CANONICAL_PARENT_BY_PRODUCT: Record<string, string | null> = {
  Station: null,
  ESS: 'Station',
  Generator: 'Station',
  Battery: 'ESS',
  PCS: 'ESS',
  Diesel: 'Generator',
  PVInverter: 'Generator',
  'PV DCDC': 'Generator',
  Voltage485: 'Generator',
  Env: 'Station',
  Load: 'Station',
  EVChargingLoad: 'Station',
  HVACLoad: 'Station',
  Load_Three_Phase: 'Station',
}

/** 默认产品列表（与后端 /api/products 一致，API 不可用时的兜底） */
export const DEFAULT_DEVICE_PRODUCTS: ProductListItem[] = [
  { parent_name: null,        product_name: 'Station' },
  { parent_name: 'Station',   product_name: 'ESS' },
  { parent_name: 'Station',   product_name: 'Generator' },
  { parent_name: 'Station',   product_name: 'Env' },
  { parent_name: 'Station',   product_name: 'Load' },
  { parent_name: 'Station',   product_name: 'EVChargingLoad' },
  { parent_name: 'Station',   product_name: 'HVACLoad' },
  { parent_name: 'Station',   product_name: 'Load_Three_Phase' },
  { parent_name: 'ESS',       product_name: 'Battery' },
  { parent_name: 'ESS',       product_name: 'PCS' },
  { parent_name: 'Generator', product_name: 'Diesel' },
  { parent_name: 'Generator', product_name: 'PVInverter' },
  { parent_name: 'Generator', product_name: 'PV DCDC' },
  { parent_name: 'Generator', product_name: 'Voltage485' },
]

export interface ProductGroup {
  key: string
  title: string
  products: ProductListItem[]
}

export type LeftPanelGroupKey = 'station' | 'containers' | 'devices'

export interface LeftPanelGroup {
  key: LeftPanelGroupKey
  title: string
  products: ProductListItem[]
}

const PRODUCT_META: Record<string, { icon: string; color: string; label?: string }> = {
  Station:        { icon: 'i-tabler-building-factory-2', color: 'blue',    label: 'Station' },
  ESS:            { icon: 'i-tabler-battery-charging',   color: 'teal',    label: 'ESS' },
  Battery:        { icon: 'i-tabler-battery-4',          color: 'green',   label: 'Battery' },
  PCS:            { icon: 'i-tabler-bolt',               color: 'orange',  label: 'PCS' },
  Generator:      { icon: 'i-tabler-engine',             color: 'purple',  label: 'Generator' },
  Diesel:         { icon: 'i-tabler-gas-station',        color: 'orange',  label: 'Diesel' },
  PVInverter:     { icon: 'i-tabler-solar-panel',        color: 'green',   label: 'PV Inverter' },
  'PV DCDC':      { icon: 'i-tabler-sun',                color: 'green',   label: 'PV DCDC' },
  Voltage485:     { icon: 'i-tabler-plug-connected-x',   color: 'default', label: 'Voltage 485' },
  Env:            { icon: 'i-tabler-temperature',        color: 'teal',    label: 'Environment' },
  Load:           { icon: 'i-tabler-plug',               color: 'default', label: 'Load' },
  EVChargingLoad: { icon: 'i-tabler-charging-pile',      color: 'blue',    label: 'EV Charging Load' },
  HVACLoad:       { icon: 'i-tabler-air-conditioning',   color: 'blue',    label: 'HVAC Load' },
  Meter:          { icon: 'i-tabler-gauge',              color: 'blue',    label: 'Meter' },
  Load_Three_Phase:{ icon: 'i-tabler-plug-connected',   color: 'default', label: 'Three-Phase Load' },
}

/** 画布容器节点（仅 ESS、Generator，无 Load 容器） */
/** 旧产品层级不再生成容器节点，拓扑容器由 Hybrid Inverter / Distribution Board 显式标记。 */
export const CONTAINER_PRODUCT_NAMES = [] as const

/** 设备所属父节点排序（左侧面板 / 布局） */
export const DEVICE_PARENT_ORDER = ['ESS', 'Generator', 'Station'] as const

/** 画布顶层容器横向顺序 */
export const CONTAINER_DISPLAY_ORDER = ['Generator', 'ESS'] as const

export const DEVICE_PARENT_FILTER_OPTIONS = [
  { label: '全部',      value: '' },
  { label: 'ESS',      value: 'ESS' },
  { label: 'Generator', value: 'Generator' },
  { label: 'Station',  value: 'Station' },
] as const

/** 可绑定设备实例的容器 */
export const BINDABLE_CONTAINER_PRODUCT_NAMES = [] as const

export function isContainerProduct(productName?: string) {
  return !!productName && CONTAINER_PRODUCT_NAMES.includes(productName as typeof CONTAINER_PRODUCT_NAMES[number])
}

export function isBindableContainerProduct(productName?: string) {
  return !!productName && BINDABLE_CONTAINER_PRODUCT_NAMES.includes(productName as typeof BINDABLE_CONTAINER_PRODUCT_NAMES[number])
}

/** Topology Config 当前拓扑节点目录；后续可直接由 products 接口替换。 */
export type TopologyNodeKind = 'standalone' | 'composite' | 'container'

export interface TopologyNodeDefinition {
  key: string
  label: string
  group: 'generation' | 'storage' | 'load'
  kind: TopologyNodeKind
  productName: string
}

export const TOPOLOGY_NODE_DEFINITIONS: TopologyNodeDefinition[] = [
  { key: 'pv-group', label: 'PV Group', group: 'generation', kind: 'standalone', productName: 'PV Group' },
  { key: 'ac-inverter', label: 'AC Inverter', group: 'generation', kind: 'standalone', productName: 'AC Inverter' },
  { key: 'diesel', label: 'Diesel', group: 'generation', kind: 'standalone', productName: 'Diesel' },
  { key: 'battery', label: 'Battery', group: 'storage', kind: 'standalone', productName: 'Battery' },
  { key: 'pcs', label: 'PCS', group: 'storage', kind: 'standalone', productName: 'PCS' },
  { key: 'hybrid-inverter', label: 'Hybrid Inverter', group: 'storage', kind: 'composite', productName: 'Hybrid Inverter' },
  { key: 'load', label: 'Load', group: 'load', kind: 'standalone', productName: 'Load' },
  { key: 'three-phase-load', label: 'Three Phase Load', group: 'load', kind: 'standalone', productName: 'Three Phase Load' },
  { key: 'ev-charging-load', label: 'EV Charging Load', group: 'load', kind: 'standalone', productName: 'EV Charging Load' },
  { key: 'hvac-load', label: 'HVAC Load', group: 'load', kind: 'standalone', productName: 'HVAC Load' },
  { key: 'distribution-board', label: 'Distribution Board', group: 'load', kind: 'container', productName: 'Distribution Board' },
]

export function topologyNodeToTemplate(definition: TopologyNodeDefinition): ModelNodeTemplate {
  const imageUrl = getProductInstanceImageUrl(definition.productName)
  return {
    id: `topology-${definition.key}`,
    type: definition.kind === 'standalone' ? 'product' : 'group',
    label: definition.label,
    description: definition.kind === 'composite'
      ? 'Composite'
      : definition.kind === 'container'
        ? 'Container'
        : 'Standalone',
    productName: definition.productName,
    topologyType: definition.kind,
    imageUrl,
  }
}

export function getTopologyPanelGroups() {
  const groups = [
    { key: 'generation', title: 'Generation', group: 'generation' as const },
    { key: 'storage', title: 'Storage & Conversion', group: 'storage' as const },
    { key: 'load', title: 'Load', group: 'load' as const },
  ]
  return groups.map((group) => ({
    ...group,
    templates: TOPOLOGY_NODE_DEFINITIONS
      .filter((definition) => definition.group === group.group)
      .map(topologyNodeToTemplate),
  }))
}

function parentRank(parentName?: string | null): number {
  if (!parentName) return DEVICE_PARENT_ORDER.length
  const idx = DEVICE_PARENT_ORDER.indexOf(parentName as (typeof DEVICE_PARENT_ORDER)[number])
  return idx === -1 ? DEVICE_PARENT_ORDER.length : idx
}

function compareProductItems(a: ProductListItem, b: ProductListItem): number {
  const parentDiff = parentRank(a.parent_name) - parentRank(b.parent_name)
  if (parentDiff !== 0) return parentDiff
  const labelA = getProductMeta(a.product_name).label ?? a.product_name
  const labelB = getProductMeta(b.product_name).label ?? b.product_name
  return labelA.localeCompare(labelB, undefined, { sensitivity: 'base' })
}

function sortByContainerDisplayOrder(products: ProductListItem[]): ProductListItem[] {
  return [...products].sort((a, b) => {
    const ia = CONTAINER_DISPLAY_ORDER.indexOf(a.product_name as (typeof CONTAINER_DISPLAY_ORDER)[number])
    const ib = CONTAINER_DISPLAY_ORDER.indexOf(b.product_name as (typeof CONTAINER_DISPLAY_ORDER)[number])
    const rankA = ia === -1 ? CONTAINER_DISPLAY_ORDER.length : ia
    const rankB = ib === -1 ? CONTAINER_DISPLAY_ORDER.length : ib
    if (rankA !== rankB) return rankA - rankB
    return compareProductItems(a, b)
  })
}

const GROUP_TITLES: Record<string, string> = {
  root:      'Station Root Devices',
  Station:   'Station Children',
  ESS:       'ESS Children',
  Generator: 'Generator Children',
}

export function getProductMeta(productName: string) {
  return PRODUCT_META[productName] ?? {
    icon: 'i-tabler-cpu',
    color: 'blue',
    label: productName,
  }
}

/** 左侧面板三组：Station / 容器(ESS+Generator) / 其余设备 */
export function groupLeftPanelProducts(products?: ProductListItem[] | null): LeftPanelGroup[] {
  const safeProducts = mergeWithDefaultProducts(products)

  const station   = safeProducts.filter((p) => p.product_name === 'Station')
  const containers = safeProducts.filter((p) => isContainerProduct(p.product_name))
  const devices   = safeProducts.filter(
    (p) => p.product_name !== 'Station' && !isContainerProduct(p.product_name),
  )

  const groups: LeftPanelGroup[] = [
    { key: 'station',    title: 'Station（Start）', products: station },
    { key: 'containers', title: 'Containers Node',  products: sortByContainerDisplayOrder(containers) },
    { key: 'devices',    title: 'Device Nodes',     products: [...devices].sort(compareProductItems) },
  ]

  return groups.filter((g) => g.products.length > 0)
}

export function groupProducts(products?: ProductListItem[] | null): ProductGroup[] {
  const safeProducts =
    Array.isArray(products) && products.length ? products : DEFAULT_DEVICE_PRODUCTS
  const roots = safeProducts.filter((p) => p.parent_name === null)
  const byParent = new Map<string, ProductListItem[]>()

  for (const p of safeProducts) {
    if (p.parent_name === null) continue
    const list = byParent.get(p.parent_name) ?? []
    list.push(p)
    byParent.set(p.parent_name, list)
  }

  const groups: ProductGroup[] = []

  if (roots.length) {
    groups.push({ key: 'root', title: GROUP_TITLES.root, products: roots })
  }

  for (const parent of ['Station', 'ESS', 'Generator']) {
    const items = byParent.get(parent)
    if (items?.length) {
      groups.push({
        key: parent,
        title: GROUP_TITLES[parent] ?? `${parent} Children`,
        products: items,
      })
    }
  }

  return groups
}

export function productToTemplate(product: ProductListItem): ModelNodeTemplate {
  const meta = getProductMeta(product.product_name)
  const isContainer = isContainerProduct(product.product_name)
  const isStation = product.product_name === 'Station'
  const imageUrl = getProductInstanceImageUrl(product.product_name)
  const parentName = CANONICAL_PARENT_BY_PRODUCT[product.product_name] ?? product.parent_name ?? undefined
  return {
    id: `product-${product.product_name}`,
    type: isStation ? 'station' : isContainer ? 'group' : 'product',
    label: meta.label ?? product.product_name,
    description: parentName ? `Container: ${parentName}` : 'Station root device',
    productName: product.product_name,
    parentName,
    imageUrl,
  }
}

/** 与 Model Config 一致的产品选项格式 */
export function productsToModelOptions(products?: ProductListItem[] | null) {
  const safeProducts = mergeWithDefaultProducts(products)
  return safeProducts.map((p) => ({
    label: getProductMeta(p.product_name).label ?? p.product_name,
    value: p.product_name,
  }))
}

/** API 产品列表与默认定义合并，保证所有已知产品始终出现在左侧面板 */
export function mergeWithDefaultProducts(products?: ProductListItem[] | null): ProductListItem[] {
  const map = new Map<string, ProductListItem>()
  for (const p of DEFAULT_DEVICE_PRODUCTS) {
    map.set(p.product_name, { ...p })
  }
  for (const p of products ?? []) {
    const prev = map.get(p.product_name)
    const apiParent = p.parent_name?.trim() ? p.parent_name : undefined
    const canonical = CANONICAL_PARENT_BY_PRODUCT[p.product_name]
    map.set(p.product_name, {
      parent_name: canonical ?? apiParent ?? prev?.parent_name ?? null,
      product_name: p.product_name,
    })
  }
  return Array.from(map.values())
}
