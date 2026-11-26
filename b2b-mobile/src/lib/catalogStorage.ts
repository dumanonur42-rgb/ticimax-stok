export class CatalogStorageError extends Error {
  constructor(public readonly originalError: unknown) {
    super('Yerel depolamaya erişilemedi. Cihazdaki boş alanı kontrol edip yeniden deneyin.')
    this.name = 'CatalogStorageError'
  }
}

export async function catalogStorage<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new CatalogStorageError(error)
  }
}
