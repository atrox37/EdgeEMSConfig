import type { ProductListItem } from '@/types/deviceConfiguration'
import type { ModelNodeTemplate } from '@/types/visualModeling'
import { getProductInstanceImageUrl } from '@/utils/productInstanceImages'

export interface LeftPanelGroup {
  key: string
  title: string
  templates: ModelNodeTemplate[]
}

/**
 * Build the topology library directly from the product API.
 * No product names, parent mappings, fallback products, or topology rules are
 * maintained by the client.
 */
export function getTopologyPanelGroups(products?: ProductListItem[] | null): LeftPanelGroup[] {
  const groups = new Map<string, LeftPanelGroup>()
  const productsByName = new Map((products ?? []).map((product) => [product.product_name, product]))

  for (const product of products ?? []) {
    const topologyType = product.topology?.type
    if (
      product.topology?.enabled !== true
      || !['standalone', 'composite', 'container'].includes(topologyType ?? '')
    ) continue

    const parentName = product.parent_name?.trim()
    const key = parentName ? `parent-${parentName}` : 'other'
    const group = groups.get(key) ?? {
      key,
      title: parentName || 'Other',
      templates: [],
    }
    const template = productToTemplate(product)
    for (const component of template.components ?? []) {
      const componentProduct = productsByName.get(component.productName)
      component.imageUrl ||= getProductInstanceImageUrl(componentProduct?.topology?.image)
    }
    group.templates.push(template)
    groups.set(key, group)
  }

  return Array.from(groups.values())
}

/** Generic presentation defaults; the displayed product name always comes from the API. */
export function getProductMeta(productName: string) {
  return {
    icon: 'i-tabler-cpu',
    color: 'blue',
    label: productName,
  }
}

export function productToTemplate(product: ProductListItem): ModelNodeTemplate {
  const topologyType = product.topology?.type
  const isGroup = topologyType === 'composite' || topologyType === 'container'

  return {
    id: `product-${product.product_name}`,
    type: topologyType === 'top-level' ? 'station' : isGroup ? 'group' : 'product',
    label: product.product_name,
    description: topologyType ? topologyType[0].toUpperCase() + topologyType.slice(1) : '',
    productName: product.product_name,
    parentName: product.parent_name ?? undefined,
    imageUrl: getProductInstanceImageUrl(product.topology?.image),
    topologyType: topologyType === 'top-level' ? undefined : topologyType,
    components: (product.topology?.components ?? [])
      .map((component) => {
        const productName = component.productName ?? component.name
        if (!productName) return undefined
        return {
          productName,
          label: component.name ?? productName,
          imageUrl: getProductInstanceImageUrl(component.image),
          selectableProductTypes: component.selectableProductTypes ?? [],
        }
      })
      .filter((component): component is NonNullable<typeof component> => !!component),
  }
}

export function productsToModelOptions(products?: ProductListItem[] | null) {
  return (products ?? []).map((product) => ({
    label: product.product_name,
    value: product.product_name,
  }))
}
