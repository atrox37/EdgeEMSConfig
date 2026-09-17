import type { Node as FlowNode } from '@vue-flow/core'
import type { ProductListItem } from '@/types/deviceConfiguration'
import { getProductInstanceImageUrl } from '@/utils/productInstanceImages'

export function enrichTopologyNodesWithImages(
  flowNodes: FlowNode[],
  products: ProductListItem[],
): FlowNode[] {
  const productsByName = new Map(products.map((product) => [product.product_name, product]))

  return flowNodes.map((node) => {
    const data = node.data as { productName?: string; imageUrl?: string }
    const productName = data.productName
    const product = productName ? productsByName.get(productName) : undefined
    if (!productName || !product) return node

    return {
      ...node,
      data: {
        ...node.data,
        imageUrl: getProductInstanceImageUrl(product.topology?.image ?? undefined),
      },
    }
  })
}
