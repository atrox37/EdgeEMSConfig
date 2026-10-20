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
  for (const product of products ?? []) {
    if (!product.topology) continue

    const productType = product.type?.trim() || 'Other'
    const key = `type-${productType}`
    const group = groups.get(key) ?? {
      key,
      title: productType,
      templates: [],
    }
    group.templates.push(productToTemplate(product))
    groups.set(key, group)
  }

  return Array.from(groups.values())
}

export function productToTemplate(product: ProductListItem): ModelNodeTemplate {
  return {
    id: `product-${product.product_name}`,
    type: 'product',
    label: product.product_name,
    description: product.topology?.description?.trim() || product.description?.trim() || '',
    productName: product.product_name,
    imageUrl: getProductInstanceImageUrl(product.topology?.image ?? undefined),
    connections: product.topology?.connections ?? [],
  }
}

export function productsToModelOptions(products?: ProductListItem[] | null) {
  return (products ?? []).map((product) => ({
    label: product.product_name,
    value: product.product_name,
  }))
}
