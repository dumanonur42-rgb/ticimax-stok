import dimsData from './bearingDimsData.json'

// Rulman koda ait sınır ölçüleri (mm): [iç çap d, dış çap D, genişlik B].
// Kaynak: ISO 15 / ISO 355 / ISO 104 sınır ölçü tabloları (SKF kataloğuyla çapraz doğrulanmış).
// Tek sıra radyal rulmanlarda (sabit bilyalı, eğik bilyalı, silindirik makaralı, oynak bilyalı)
// aynı ISO ölçü serisi aynı sınır ölçüleri taşır; örn. NU204, 7204 ve 6204 hep 20x47x14'tür.
const TABLE = dimsData as unknown as Record<string, [number, number, number]>

// Keçe/kapak, boşluk, kafes ve tolerans ekleri sınır ölçüyü değiştirmez; koddan soyulur.
const SUFFIXES = [
  '2RSR', '2RS1', '2RSH', '2RSN', '2RS', 'RSR', 'RS1', 'RSH', 'RS', '2RZ', '2Z', 'ZZR', 'ZZ', 'ZR', 'Z',
  'LLU', 'LLB', 'LLH', 'DDU', 'VV', 'UU', '2RU', 'RU',
  'C3', 'C4', 'C5', 'P6', 'P5', 'P4', 'CN',
  'TVP2', 'TVH', 'TVP', 'TNG', 'TN9', 'TN', 'T2', 'T', 'M', 'MA', 'MB', 'ME', 'E1', 'E', 'J', 'Y', 'F',
  'BECBP', 'BEP', 'B', 'A', 'AC', 'C',
  'K30', 'K', 'W33', 'N', 'NR', 'G2', 'NPP', 'NPPB', 'KRRB', 'KRR', 'H', 'HT', 'CS', 'XL', 'S1', 'Q', 'VG', 'R6'
]

const stripSuffixes = (code: string): string => {
  let text = code
  for (;;) {
    const rest = text.replace(/[\s-]+$/, '')
    const tail = rest.match(/[\s-]?([A-Z0-9]+)$/)
    if (!tail) return rest
    if (SUFFIXES.includes(tail[1]) && rest.length > tail[1].length + 1) {
      text = rest.slice(0, rest.length - tail[0].length)
      continue
    }
    return rest
  }
}

const norm = (sku: string): string =>
  sku.toLocaleUpperCase('tr-TR').replace(/×/g, 'X').replace(/\s+/g, ' ').trim()

const hit = (key: string): [number, number, number] | null => TABLE[key] ?? null

/** Koddan (varsa) sınır ölçüleri çıkarır: [iç çap, dış çap, genişlik] mm. Bulunamazsa null. */
export const lookupBearingDims = (sku: string, brand = ''): [number, number, number] | null => {
  void brand
  const raw = norm(sku)

  // Koda gömülü ölçü "25X52X15" / "25*52*15"
  const dims = raw.match(/(\d+(?:[.,]\d+)?)\s*[X*]\s*(\d+(?:[.,]\d+)?)\s*[X*]\s*(\d+(?:[.,]\d+)?)/)
  if (dims) {
    const d = Number(dims[1].replace(',', '.'))
    const D = Number(dims[2].replace(',', '.'))
    const B = Number(dims[3].replace(',', '.'))
    if (d > 0 && D > d && B > 0) return [d, D, B]
  }

  // Boşluklu yazımı birleştir: "NU 204" -> "NU204", "6204 ZZ" eklentisi soyulur
  const glued = raw.replace(/^([A-Z]{1,4})\s+(?=\d)/, '$1')
  const core = stripSuffixes(glued).replace(/[\s-]+$/, '')

  const direct = hit(core)
  if (direct) return direct
  const directNoSpace = hit(core.replace(/[\s-]/g, ''))
  if (directNoSpace) return directNoSpace

  // Silindirik makaralı: NU/NJ/NUP/NF/N/RNU + numara (sonraki harfler kafes/güçlendirme ekidir, ölçüyü değiştirmez)
  const crb = core.match(/^(?:RNU|NU|NJ|NUP|NF|NCF|NJG)\s?(\d{3,5})(?:\s|[A-Z]|$)/)
  if (crb) {
    const digits = crb[1]
    const bore = digits.slice(-2)
    const series = digits.slice(0, -2)
    const via = (key: string): [number, number, number] | null => hit(key)
    const found = series === '2' ? via(`62${bore}`) : series === '3' ? via(`63${bore}`) : series === '10' ? via(`60${bore}`) : series === '22' ? via(`22${bore}`) : series === '23' ? via(`23${bore}`) : null
    if (found) return found
  }

  // Eğik bilyalı tek sıra: 70xx->60xx, 72xx->62xx, 73xx->63xx sınır ölçüleri
  const acbb = core.match(/^(70|72|73)\s?(\d{2})(?:\s|[A-Z]|$)/)
  if (acbb) {
    const base = acbb[1] === '70' ? '60' : acbb[1] === '72' ? '62' : '63'
    const found = hit(`${base}${acbb[2]}`)
    if (found) return found
  }
  // QJ/QJF dört nokta temas da 3xx/2xx serisi ölçülerini taşır
  const qj = core.match(/^QJ\s?(2|3)\s?(\d{2})/)
  if (qj) {
    const found = hit(`${qj[1] === '2' ? '62' : '63'}${qj[2]}`)
    if (found) return found
  }

  // Oynak bilyalı: 12xx->62xx, 13xx->63xx ölçü serisi; 22xx/23xx geniş seri (sonraki harfler ek)
  const sabb = core.match(/^(12|13)\s?(\d{2})(?:\s|[A-Z]|$)/)
  if (sabb) {
    const found = hit(`${sabb[1] === '12' ? '62' : '63'}${sabb[2]}`)
    if (found) return found
  }
  const sabbWide = core.match(/^(22|23)\s?(\d{2})(?:\s|[A-Z]|$)/)
  if (sabbWide) {
    const found = hit(`${sabbWide[1]}${sabbWide[2]}`)
    if (found) return found
  }

  // Sabit bilyalı ve diğer seriler: önde gelen numarayı al, ekleri yut
  const numeric = core.match(/^(\d{3,7})(?:\s|[A-Z]|$)/)
  if (numeric) {
    const found = hit(numeric[1])
    if (found) return found
  }

  // Sabit bilyalı 6x serileri doğrudan tabloda; yukarıdaki direct denemeleri yakalar.
  // Konik 302/303/320, eksenel 511, iğneli HK/NK, AXK, LM, R, MR doğrudan tablodadır.

  // Çift sıra silindirik NN/NNU 30xx serisi (sonraki harfler ek)
  const nn = core.match(/^(NNU|NN)\s?(\d{4,5})(?:\s|[A-Z]|$)/)
  if (nn) {
    const found = hit(`NN${nn[2]}`)
    if (found) return found
  }

  // İğneli NK/NKI/RNA/NKIA "NK5/10", "NKI 60/25" yazımı boşluklu gelebilir
  const nk = core.match(/^(NKI|NKIS|NKIA|NK|RNA)\s?(\d+\s?\/\s?\d+)(?:\s|[A-Z]|$)/)
  if (nk) {
    const compact = nk[2].replace(/\s/g, '')
    const found = hit(`${nk[1]}${compact}`) ?? hit(`NK${compact}`)
    if (found) return found
  }
  const nkPlain = core.match(/^(NKI|NKIS|NK|RNA)\s?(\d{4})(?:\s|[A-Z]|$)/)
  if (nkPlain) {
    const found = hit(`${nkPlain[1]}${nkPlain[2]}`) ?? hit(`NA${nkPlain[2]}`)
    if (found) return found
  }

  // İğneli kovan BK/HK + numara (ekler yutulur)
  const hk = core.match(/^(BK|HK|SCE|BCE|SCH)\s?(\d{3,5})(?:\s|[A-Z]|$)/)
  if (hk) {
    const found = hit(`${hk[1]}${hk[2]}`) ?? hit(`HK${hk[2]}`)
    if (found) return found
  }

  // LM lineer: UU eki tablodadır; eksikse dene
  const lm = core.match(/^LM\s?(\d+)(UU)?$/)
  if (lm) return hit(`LM${lm[1]}UU`) ?? hit(`LM${lm[1]}`)

  // KM somun (DIN 981): "KM 21", "KM21"
  const km = core.match(/^KM\s?(\d{1,2})(?:\s|$)/)
  if (km) {
    const found = hit(`KM${km[1].padStart(2, '0')}`) ?? hit(`KM${km[1]}`)
    if (found) return found
  }

  // Küresel düz rulman GE serisi: "GE 40 UK 2RS", "GE20ES" — E/ES/UK/2RS ekleri sınır ölçüyü değiştirmez
  const ge = core.match(/^GE\s?(\d{2,3})(?:E|ES|UK|DO)?(?:\s|2RS|$)/)
  if (ge) {
    const found = hit(`GE${ge[1]}`) ?? hit(`GE${ge[1]}ES`)
    if (found) return found
  }

  // Adaptör kovanı H/HE + numara: "H 3132", "H3132" — ölçüler kovanın kendi sınır ölçüleridir
  const sleeve = core.match(/^(HE|H)\s?(\d{3,4})(?:\s|[A-Z]|$)/)
  if (sleeve) {
    const found = hit(`${sleeve[1]}${sleeve[2]}`) ?? hit(`H${sleeve[2]}`)
    if (found) return found
  }

  // İnç R serisi: "R2-5", "R144" — tire/boşluk farkını yut
  const inch = core.match(/^R\s?(\d{1,3}(?:-\d)?)$/)
  if (inch) return hit(`R${inch[1]}`) ?? hit(`R${inch[1].replace('-', '')}`)

  return null
}
