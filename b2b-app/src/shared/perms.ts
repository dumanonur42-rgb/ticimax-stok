import { PERMS, type Perm, type User, type UserRole } from './types'

export const PERM_INFO: Record<Perm, { label: string; hint: string }> = {
  shelf: { label: 'Raf konumunu görür', hint: 'Ürün listesinde, detayda ve Ana Sayfa\'da raf sütunu gösterilir.' },
  prices: { label: 'Fiyatları görür', hint: 'Bayilere fiyat gizlense bile bu kullanıcı fiyatları görür.' },
  all_orders: { label: 'Tüm siparişleri görür', hint: 'Yalnızca kendi siparişleri yerine tüm bayilerin siparişlerini listeler.' },
  export: { label: 'Ürün listesini Excel\'e aktarır', hint: 'Ürünler sayfasından Excel indirme düğmesi açılır.' },
  description: { label: 'Ürün açıklamasını görür', hint: 'Açıklama kısıtlıyken yalnızca bu yetki verilen kullanıcılar ürün açıklamalarını görür.' }
}

/** Abilities that come with the role itself; granted perms are added on top. */
export const ROLE_PERMS: Record<UserRole, readonly Perm[]> = { admin: PERMS, ara: ['shelf'], bayi: [] }

/** Yönetici ayarıyla kısıtlanan yetkilerde rolle gelen hak geçersizdir; yalnızca kişiye özel verilen yetki sayılır. */
let restrictions: { shelf: boolean; description: boolean } = { shelf: false, description: false }

export function configurePermRestrictions(flags: { restrict_shelf?: boolean; restrict_description?: boolean }): void {
  restrictions = { shelf: !!flags.restrict_shelf, description: !!flags.restrict_description }
}

export function hasPerm(user: Pick<User, 'role' | 'perms'> | null | undefined, perm: Perm): boolean {
  if (!user) return false
  if ((user.perms ?? []).includes(perm)) return true
  if (user.role === 'admin') return true
  const restricted = (perm === 'shelf' && restrictions.shelf) || (perm === 'description' && restrictions.description)
  if (restricted) return false
  return ROLE_PERMS[user.role].includes(perm)
}

export function isPerm(v: string): v is Perm {
  return (PERMS as readonly string[]).includes(v)
}
