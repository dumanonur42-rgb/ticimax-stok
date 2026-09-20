import { cloud, mustVoid } from '../cloud/client'
import type { ProductInsert } from '../cloud/database.types'
import { pullProducts } from '../cloud/sync'
import { normalize, normalizeText } from '../db'

// Demo catalogue for performance testing. Every SKU is a plain bearing
// designation (no brand suffix) and unique; the brand lives in its own column.
const BRANDS = ['SKF', 'FAG', 'NSK', 'NTN', 'KOYO', 'TIMKEN', 'ZKL', 'URB', 'NACHI', 'INA', 'KG', 'ORS']
const PREMIUM = new Set(['SKF', 'FAG', 'TIMKEN', 'NSK', 'INA'])

// bore code -> d (mm)
const BORES: [string, number][] = [
  ['00', 10],
  ['01', 12],
  ['02', 15],
  ['03', 17],
  ...Array.from({ length: 41 }, (_, i): [string, number] => {
    const code = i + 4
    return [String(code).padStart(2, '0'), code * 5]
  })
]

// deep groove series: prefix, D = a·d + b, B = c·d + e
const DEEP_GROOVE: [string, number, number, number, number][] = [
  ['618', 1.17, 7.5, 0.08, 5],
  ['619', 1.3, 9.5, 0.15, 5],
  ['160', 1.3, 15, 0.05, 7],
  ['60', 1.3, 15, 0.16, 8],
  ['62', 1.7, 9.5, 0.25, 8.5],
  ['63', 2.05, 11, 0.4, 7],
  ['64', 2.0, 30, 0.4, 11]
]
// suffix, seal label, equivalence group
const DG_SUFFIX: [string, string, string][] = [
  ['', 'Açık', ''],
  ['Z', 'Tek Metal Kapaklı', 'Z'],
  ['ZZ', 'Metal Kapaklı', 'ZZ'],
  ['2Z', 'Metal Kapaklı', 'ZZ'],
  ['RS', 'Tek Kauçuk Keçeli', 'RS'],
  ['2RS', 'Kauçuk Keçeli', '2RS'],
  ['2RS1', 'Kauçuk Keçeli', '2RS'],
  ['2RSR', 'Kauçuk Keçeli', '2RS'],
  ['DDU', 'Kauçuk Keçeli', '2RS'],
  ['LLU', 'Kauçuk Keçeli', '2RS'],
  ['N', 'Açık (Segman Kanallı)', ''],
  ['NR', 'Açık (Segmanlı)', ''],
  ['TN9', 'Açık (Polyamid Kafes)', ''],
  ['ZZ NR', 'Metal Kapaklı (Segmanlı)', 'ZZ'],
  ['2RS NR', 'Kauçuk Keçeli (Segmanlı)', '2RS']
]
const DG_EQUIV: Record<string, string[]> = {
  ZZ: ['ZZ', '2Z'],
  '2RS': ['2RS', '2RS1', '2RSR', 'DDU', 'LLU']
}
const CLEARANCES = ['', 'C3']

// prefix, type, D/B coefficients, suffix variants
const ANGULAR: [string, number, number, number, number, string[]][] = [
  ['72', 1.7, 9.5, 0.25, 8.5, ['B-TVP', 'B-TVP UA', 'B-MP', 'B-2RS-TVP', 'BECBP', 'BEGAP']],
  ['73', 2.05, 11, 0.4, 7, ['B-TVP', 'B-TVP UA', 'B-MP', 'B-2RS-TVP', 'BECBP', 'BEGAP']]
]
const SELF_ALIGNING: [string, number, number, number, number, string[]][] = [
  ['12', 1.7, 9.5, 0.25, 8.5, ['', 'K', 'TVH', 'K-TVH', '2RS']],
  ['13', 2.05, 11, 0.4, 7, ['', 'K', 'TVH', 'K-TVH', '2RS']],
  ['22', 1.7, 9.5, 0.4, 10, ['', 'K', 'TVH', 'K-TVH', '2RS']],
  ['23', 2.05, 11, 0.6, 9, ['', 'K', 'TVH', 'K-TVH', '2RS']]
]
const TAPERED: [string, number, number, number, number, string[]][] = [
  ['302', 1.7, 9.5, 0.3, 8, ['', 'J2/Q', 'A', 'X']],
  ['303', 2.05, 11, 0.45, 8, ['', 'J2/Q', 'A', 'X']],
  ['320', 1.45, 12, 0.3, 8, ['', 'X', 'XA']],
  ['322', 1.7, 9.5, 0.45, 9, ['', 'J2/Q', 'A']],
  ['323', 2.05, 11, 0.7, 10, ['', 'J2/Q', 'A']],
  ['313', 2.05, 11, 0.45, 8, ['', 'J2/Q', 'A']]
]
const SPHERICAL: [string, number, number, number, number, string[]][] = [
  ['222', 1.7, 9.5, 0.45, 10, ['', 'K', 'E', 'EK', 'CC/W33', 'CCK/W33', 'E1-XL']],
  ['223', 2.05, 11, 0.7, 12, ['', 'K', 'E', 'EK', 'CC/W33', 'CCK/W33', 'E1-XL']],
  ['213', 2.05, 11, 0.45, 9, ['', 'K', 'E', 'EK', 'CC/W33']],
  ['230', 1.45, 12, 0.45, 8, ['', 'K', 'E', 'CC/W33', 'CCK/W33']],
  ['231', 1.55, 14, 0.55, 10, ['', 'K', 'E', 'CC/W33', 'CCK/W33']],
  ['232', 1.7, 9.5, 0.65, 12, ['', 'K', 'E', 'CC/W33', 'CCK/W33']],
  ['240', 1.45, 12, 0.6, 10, ['', 'K', 'CC/W33', 'CCK/W33']]
]
const CYL_TYPES = ['NU', 'NJ', 'N', 'NUP', 'NF']
const CYL: [string, number, number, number, number, string[]][] = [
  ['2', 1.7, 9.5, 0.25, 8.5, ['', 'E', 'M', 'ECP', 'ECM']],
  ['3', 2.05, 11, 0.4, 7, ['', 'E', 'M', 'ECP', 'ECM']],
  ['22', 1.7, 9.5, 0.4, 10, ['', 'E', 'ECP']],
  ['23', 2.05, 11, 0.6, 9, ['', 'E', 'ECP']],
  ['10', 1.3, 15, 0.16, 8, ['', 'M', 'ECP']]
]
const THRUST: [string, number, number, number, number, string[]][] = [
  ['511', 1.5, 10, 0.2, 7, ['']],
  ['512', 1.7, 12, 0.3, 8, ['']],
  ['513', 2.0, 14, 0.45, 9, ['']],
  ['514', 2.3, 18, 0.6, 12, ['']],
  ['532', 1.7, 12, 0.35, 9, ['U']]
]
const INSERT_TYPES: [string, string][] = [
  ['UC', 'Yatak Rulmanı (UC)'],
  ['UK', 'Yatak Rulmanı (UK, konik delik)'],
  ['SA', 'Yatak Rulmanı (SA)'],
  ['SB', 'Yatak Rulmanı (SB)'],
  ['UCX', 'Yatak Rulmanı (UCX)']
]
const HOUSING_TYPES: [string, string][] = [
  ['UCP', 'Ayaklı Yatak'],
  ['UCF', 'Kare Flanşlı Yatak'],
  ['UCFL', 'Oval Flanşlı Yatak'],
  ['UCT', 'Gergi Yatak'],
  ['UCPA', 'Ayaklı Yatak (Dar)'],
  ['UCFC', 'Yuvarlak Flanşlı Yatak'],
  ['UCPH', 'Ayaklı Yatak (Yüksek)'],
  ['UCFB', 'Üç Delikli Flanşlı Yatak']
]
const HOUSING_ONLY: [string, string][] = [
  ['P', 'Ayaklı Yatak Gövdesi'],
  ['F', 'Kare Flanşlı Gövde'],
  ['FL', 'Oval Flanşlı Gövde'],
  ['T', 'Gergi Gövde'],
  ['SN', 'Yatak Gövdesi SN']
]
const NEEDLE_TYPES: [string, string][] = [
  ['HK', 'İğneli Rulman (Çekme Kovanlı)'],
  ['BK', 'İğneli Rulman (Kapalı Kovanlı)'],
  ['HK-2RS', 'İğneli Rulman (Keçeli)'],
  ['NK', 'İğneli Rulman (İç Bileziksiz)'],
  ['NKI', 'İğneli Rulman (İç Bilezikli)'],
  ['NA49', 'İğneli Rulman NA49'],
  ['NA69', 'İğneli Rulman NA69'],
  ['RNA49', 'İğneli Rulman RNA49']
]
const SEAL_TYPES = ['TC', 'SC', 'TB', 'TG', 'VC']

interface Row {
  sku: string
  name: string
  brand: string
  category: string
  type: string
  seal: string
  d_inner: number | null
  d_outer: number | null
  width: number | null
  equivalents: string
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const dim = (d: number, a: number, b: number): number => Math.round(a * d + b)

export function generateDemoCatalog(target: number): Row[] {
  const rows: Row[] = []
  const seen = new Set<string>()
  // one brand per designation, chosen deterministically (premium brands more often)
  const brandFor = (sku: string, pool: string[] = BRANDS): string => {
    const h = hash(sku)
    const weighted = h % 3 === 0 ? pool : pool.filter((b) => PREMIUM.has(b))
    const list = weighted.length ? weighted : pool
    return list[(h >>> 4) % list.length]
  }
  const add = (r: Omit<Row, 'brand'> & { brand?: string }): void => {
    const k = normalize(r.sku)
    if (seen.has(k)) return
    seen.add(k)
    rows.push({ ...r, brand: r.brand ?? brandFor(r.sku) })
  }
  const family = (list: [string, number, number, number, number, string[]][], category: string, type: string, label: string, sep = ' '): void => {
    for (const [prefix, a, b, c, e, variants] of list)
      for (const [code, d] of BORES)
        for (const v of variants)
          add({
            sku: `${prefix}${code}${v ? sep + v : ''}`,
            name: `${prefix}${code}${v ? sep + v : ''} ${label} ${d}x${dim(d, a, b)}x${dim(d, c, e)}`,
            category,
            type,
            seal: '',
            d_inner: d,
            d_outer: dim(d, a, b),
            width: dim(d, c, e),
            equivalents: ''
          })
  }

  for (const [prefix, a, b, c, e] of DEEP_GROOVE)
    for (const [code, d] of BORES) {
      const base = `${prefix}${code}`
      for (const [suffix, sealName, group] of DG_SUFFIX)
        for (const clearance of CLEARANCES) {
          const sku = `${suffix ? `${base}-${suffix}` : base}${clearance ? ` ${clearance}` : ''}`
          const eq = (DG_EQUIV[group] ?? [])
            .filter((s) => s !== suffix)
            .map((s) => `${base}-${s}${clearance ? ` ${clearance}` : ''}`)
            .join(', ')
          add({
            sku,
            name: `${sku} ${sealName} Sabit Bilyalı Rulman ${d}x${dim(d, a, b)}x${dim(d, c, e)}${clearance ? ' (C3 boşluklu)' : ''}`,
            category: 'Sabit Bilyalı Rulmanlar',
            type: 'Sabit Bilyalı',
            seal: suffix.split(' ')[0] || 'Açık',
            d_inner: d,
            d_outer: dim(d, a, b),
            width: dim(d, c, e),
            equivalents: eq
          })
        }
    }

  family(ANGULAR, 'Eğik Bilyalı Rulmanlar', 'Eğik Bilyalı', 'Eğik Bilyalı Rulman', '-')
  family(SELF_ALIGNING, 'Oynak Bilyalı Rulmanlar', 'Oynak Bilyalı', 'Oynak Bilyalı Rulman', '-')
  family(TAPERED, 'Konik Makaralı Rulmanlar', 'Konik Makaralı', 'Konik Makaralı Rulman')
  family(SPHERICAL, 'Oynak Makaralı Rulmanlar', 'Oynak Makaralı', 'Oynak Makaralı Rulman')
  for (const t of CYL_TYPES)
    family(
      CYL.map(([p, a, b, c, e, v]): [string, number, number, number, number, string[]] => [`${t}${p}`, a, b, c, e, v]),
      'Silindirik Makaralı Rulmanlar',
      'Silindirik Makaralı',
      'Silindirik Makaralı Rulman'
    )
  family(THRUST, 'Eksenel Bilyalı Rulmanlar', 'Eksenel Bilyalı', 'Eksenel Bilyalı Rulman')

  const insertBores = BORES.slice(1, 30)
  for (const [prefix, label] of INSERT_TYPES)
    for (const [code, d] of insertBores)
      add({
        sku: `${prefix}2${code}`,
        name: `${prefix}2${code} ${label} ${d}x${dim(d, 1.7, 9.5)}x${dim(d, 0.55, 14)}`,
        category: 'Yatak Rulmanları',
        type: label,
        seal: '',
        d_inner: d,
        d_outer: dim(d, 1.7, 9.5),
        width: dim(d, 0.55, 14),
        equivalents: ''
      })
  for (const [prefix, label] of ['UC', 'UK'] as const)
    for (const [code, d] of insertBores)
      add({
        sku: `${prefix}3${code}`,
        name: `${prefix}3${code} Yatak Rulmanı ${d}x${dim(d, 2.05, 11)}x${dim(d, 0.7, 16)}`,
        category: 'Yatak Rulmanları',
        type: `Yatak Rulmanı (${label})`,
        seal: '',
        d_inner: d,
        d_outer: dim(d, 2.05, 11),
        width: dim(d, 0.7, 16),
        equivalents: ''
      })
  const housingBrands = ['KG', 'ORS', 'ASAHI', 'FYH', 'NTN', 'SKF']
  for (const [prefix, label] of HOUSING_TYPES)
    for (const series of ['2', '3'])
      for (const [code, d] of insertBores)
        add({
          sku: `${prefix}${series}${code}`,
          name: `${prefix}${series}${code} ${label} (Ø${d})`,
          brand: brandFor(`${prefix}${series}${code}`, housingBrands),
          category: 'Yataklı Rulmanlar',
          type: label,
          seal: '',
          d_inner: d,
          d_outer: null,
          width: null,
          equivalents: ''
        })
  for (const [prefix, label] of HOUSING_ONLY)
    for (const series of ['2', '3'])
      for (const [code] of insertBores)
        add({
          sku: `${prefix}${series}${code}`,
          name: `${prefix}${series}${code} ${label}`,
          brand: brandFor(`${prefix}${series}${code}`, housingBrands),
          category: 'Rulman Yatakları',
          type: 'Yatak',
          seal: '',
          d_inner: null,
          d_outer: null,
          width: null,
          equivalents: ''
        })

  const needleD = [6, 8, 10, 12, 14, 15, 16, 17, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 50, 55, 60, 65, 70, 75, 80]
  for (const [prefix, label] of NEEDLE_TYPES)
    for (const d of needleD)
      for (const B of prefix.startsWith('NA') || prefix.startsWith('RNA') ? [0] : [8, 10, 12, 16, 20]) {
        const dd = String(d).padStart(2, '0')
        const isNA = B === 0
        const width = isNA ? dim(d, 0.25, 10) : B
        const outer = isNA ? dim(d, 1.55, 10) : d + (d < 20 ? 4 : d < 40 ? 7 : 10)
        const [head, tail] = prefix.split('-')
        const sku = isNA ? `${prefix}${dd}` : `${head}${dd}${String(B).padStart(2, '0')}${tail ? `-${tail}` : ''}`
        add({
          sku,
          name: `${sku} ${label} ${d}x${outer}x${width}`,
          category: 'İğneli Rulmanlar',
          type: 'İğneli',
          seal: tail ?? '',
          d_inner: d,
          d_outer: outer,
          width,
          equivalents: ''
        })
      }

  const sealBrands = ['KOR', 'CFW', 'NAK', 'SOG', 'KG']
  const sealD = Array.from({ length: 30 }, (_, i) => 10 + i * 5)
  for (const d of sealD)
    for (const extra of [10, 12, 15, 20, 25])
      for (const B of d < 30 ? [7] : d < 60 ? [7, 8, 10] : [8, 10, 12])
        for (const t of SEAL_TYPES) {
          const D = d + extra
          const sku = `${t} ${d}x${D}x${B}`
          add({
            sku,
            name: `Yağ Keçesi ${sku}`,
            brand: brandFor(sku, sealBrands),
            category: 'Keçeler',
            type: 'Yağ Keçesi',
            seal: t,
            d_inner: d,
            d_outer: D,
            width: B,
            equivalents: ''
          })
        }

  // interleave categories so any prefix of the list is still a mixed catalogue
  rows.sort((x, y) => hash(x.sku) - hash(y.sku))
  return rows.slice(0, target)
}

/** Demo catalogue for trying the app before the real stock list arrives; written to the shared cloud like an import. */
export async function seedDemo(target: number): Promise<number> {
  const rand = mulberry32(42)
  const rows = generateDemoCatalog(target)
  const batch: ProductInsert[] = rows.map((r) => {
    const size = (r.d_outer ?? 60) * (r.width ?? 12)
    const premium = ['SKF', 'FAG', 'TIMKEN', 'NSK', 'INA'].includes(r.brand) ? 2.2 : 1
    const price = Math.round(size * 0.12 * premium * (0.8 + rand() * 0.6) * 100) / 100 + 15
    const stockRoll = rand()
    const stock = stockRoll < 0.15 ? 0 : stockRoll < 0.3 ? Math.floor(rand() * 5) + 1 : Math.floor(rand() * 400) + 5
    return {
      sku: r.sku,
      sku_norm: normalize(r.sku),
      name: r.name,
      name_norm: normalizeText(r.name),
      brand: r.brand,
      category: r.category,
      type: r.type,
      seal: r.seal,
      d_inner: r.d_inner,
      d_outer: r.d_outer,
      width: r.width,
      stock,
      unit: 'Adet',
      price,
      currency: 'TRY',
      list_price: Math.round(price * 1.35 * 100) / 100,
      card_price: Math.round(price * 1.08 * 100) / 100,
      min_order: 1,
      shelf: `${String.fromCharCode(65 + Math.floor(rand() * 8))}-${Math.floor(rand() * 40) + 1}`,
      barcode: '',
      image: '',
      description: '',
      equivalents: r.equivalents,
      active: true,
      deleted: false
    }
  })
  const sb = cloud()
  for (let i = 0; i < batch.length; i += 500) {
    mustVoid(await sb.from('products').upsert(batch.slice(i, i + 500), { onConflict: 'sku_norm', ignoreDuplicates: true }))
  }
  await pullProducts()
  return batch.length
}
