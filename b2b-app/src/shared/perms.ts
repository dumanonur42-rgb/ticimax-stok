import { PERMS, type Perm, type User, type UserRole } from './types'

export const PERM_INFO: Record<Perm, { label: string; hint: string }> = {
  shelf: { label: 'Raf konumunu görür', hint: 'Ürün listesinde, detayda ve Özet\'te raf sütunu gösterilir.' },
  prices: { label: 'Fiyatları görür', hint: 'Bayilere fiyat gizlense bile bu kullanıcı fiyatları görür.' },
  all_orders: { label: 'Tüm siparişleri görür', hint: 'Yalnızca kendi siparişleri yerine tüm bayilerin siparişlerini listeler.' },
  export: { label: 'Ürün listesini Excel\'e aktarır', hint: 'Ürünler sayfasından Excel indirme düğmesi açılır.' }
}

/** Abilities that come with the role itself; granted perms are added on top. */
export const ROLE_PERMS: Record<UserRole, readonly Perm[]> = { admin: PERMS, ara: ['shelf'], bayi: [] }

export function hasPerm(user: Pick<User, 'role' | 'perms'> | null | undefined, perm: Perm): boolean {
  if (!user) return false
  return ROLE_PERMS[user.role].includes(perm) || (user.perms ?? []).includes(perm)
}

export function isPerm(v: string): v is Perm {
  return (PERMS as readonly string[]).includes(v)
}
