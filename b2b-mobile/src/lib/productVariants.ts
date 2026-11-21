import { normalize } from '@shared/identity'
import type { Product } from '@shared/types'

export function productVariantKey(sku: string, brand: string): string {
  return `${normalize(sku)}|${normalize(brand)}`
}

export function indexProductVariants(products: Product[]): Map<string, Product[]> {
  const index = new Map<string, Product[]>()
  for (const product of products) {
    const key = productVariantKey(product.sku, product.brand)
    index.set(key, [...(index.get(key) ?? []), product])
  }
  return index
}
