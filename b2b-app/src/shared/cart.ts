import { boxIdentity, normalize } from './identity'

export interface CartProductIdentity {
  id: number
  sku: string
  brand: string
  box: string
}

export function findRefreshedCartProduct<T extends CartProductIdentity>(
  line: CartProductIdentity,
  products: T[]
): T | undefined {
  return products.find((product) => product.id === line.id) ??
    products.find((product) =>
      normalize(product.sku) === normalize(line.sku) &&
      normalize(product.brand) === normalize(line.brand) &&
      normalize(boxIdentity(product.box)) === normalize(boxIdentity(line.box ?? ''))
    )
}
