export async function loginEmail(username: string): Promise<string> {
  const lower = username.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
  const slug = lower
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9._-]/g, '')
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(lower))
  const tag = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 8)
  return `${slug || 'u'}-${tag}@login.yamansab2b.app`
}
