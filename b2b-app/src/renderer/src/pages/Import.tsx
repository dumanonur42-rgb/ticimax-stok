import type { Currency, ImportLog, ImportPreview, ProductInput } from '@shared/types'
import { FileSpreadsheet, FileDown, Upload } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Field, Spinner } from '@/components/ui'
import { api } from '@/lib/api'
import { date, num } from '@/lib/format'
import { useApp } from '@/store/app'

type MapKey = keyof ProductInput
const FIELDS: { key: MapKey; label: string; required?: boolean }[] = [
  { key: 'shelf', label: 'Raf' },
  { key: 'sku', label: 'Ürün kodu / adı', required: true },
  { key: 'brand', label: 'Marka' },
  { key: 'stock', label: 'Adet (stok)' },
  { key: 'box', label: 'Kutu durumu' },
  { key: 'price', label: 'Fiyat (peşin)' },
  { key: 'description', label: 'Açıklama' },
  { key: 'card_price', label: 'Kredi kartı fiyatı' },
  { key: 'name', label: 'Uzun ürün adı' },
  { key: 'category', label: 'Kategori' },
  { key: 'type', label: 'Tip' },
  { key: 'seal', label: 'Keçe / Kapak' },
  { key: 'd_inner', label: 'İç çap (d)' },
  { key: 'd_outer', label: 'Dış çap (D)' },
  { key: 'width', label: 'Genişlik (B)' },
  { key: 'unit', label: 'Birim' },
  { key: 'currency', label: 'Para birimi' },
  { key: 'list_price', label: 'Liste fiyatı' },
  { key: 'min_order', label: 'Min. sipariş' },
  { key: 'barcode', label: 'Barkod' },
  { key: 'equivalents', label: 'Muadiller' }
]

export function Import(): ReactNode {
  const { toast, settings } = useApp()
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<MapKey, string>>>({})
  const [mode, setMode] = useState<'upsert' | 'replace' | 'stock_only'>('upsert')
  const [deactivateMissing, setDeactivateMissing] = useState(false)
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(settings?.default_currency ?? 'TRY')
  const [defaultBrand, setDefaultBrand] = useState('')
  const [defaultCategory, setDefaultCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const loadLogs = (): void => {
    api('import:logs', undefined).then(setLogs).catch(() => setLogs([]))
  }
  useEffect(loadLogs, [])

  const pick = async (): Promise<void> => {
    setBusy(true)
    try {
      const p = await api('import:pick', undefined)
      if (p) {
        setPreview(p)
        setMapping(p.suggestedMapping)
        setErrors([])
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const run = async (): Promise<void> => {
    if (!preview) return
    if (!mapping.sku) return toast('Ürün kodu kolonu eşlenmeli.', 'error')
    if (mode === 'replace' && !window.confirm('Mevcut tüm ürünler silinip dosyadaki ürünler yüklenecek. Devam edilsin mi?')) return
    setBusy(true)
    try {
      const r = await api('import:run', { token: preview.token, mapping, mode, deactivateMissing, defaultCurrency, defaultBrand, defaultCategory })
      toast(`İçe aktarım tamam: ${num(r.inserted)} yeni, ${num(r.updated)} güncel, ${num(r.unchanged)} değişmedi.`, 'success')
      setErrors(r.errors)
      setPreview(null)
      loadLogs()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const used = new Set(Object.values(mapping).filter(Boolean))

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="card grid" style={{ gap: 12 }} aria-labelledby="imp-title">
        <h2 id="imp-title">Stok listesi yükle</h2>
        <p className="muted">
          Excel (.xlsx, .xls) veya CSV dosyanızı seçin. Beklenen düzen: <b>RAF | ÜRÜN ADI | MARKA | ADET | KUTU DURUMU | FİYAT | AÇIKLAMA</b> (boş hücreler sorun olmaz; kolon başlıkları otomatik
          eşlenir, gerekirse aşağıdan düzeltin). Yalnızca ürün kodu zorunludur; aynı kod + marka + kutu durumu tek üründür, dosyada iki kez geçerse adetler toplanır.
        </p>
        <div className="row wrap">
          <button className="btn primary" onClick={pick} disabled={busy}>
            <Upload size={16} aria-hidden /> Dosya seç…
          </button>
          <button className="btn" onClick={() => api('import:template', undefined).then((p) => p && toast(`Şablon kaydedildi: ${p}`, 'success')).catch((e) => toast(e.message, 'error'))}>
            <FileDown size={16} aria-hidden /> Örnek şablon indir
          </button>
          {busy && <Spinner />}
        </div>
      </section>

      {preview && (
        <section className="card grid" style={{ gap: 14 }} aria-labelledby="map-title">
          <div className="row wrap">
            <h2 id="map-title" style={{ margin: 0 }}>
              <FileSpreadsheet size={18} aria-hidden style={{ verticalAlign: -3 }} /> {preview.filename}
            </h2>
            <span className="badge info">{num(preview.totalRows)} satır</span>
            <span className="badge neutral">{preview.headers.length} kolon</span>
          </div>

          <div className="grid g3">
            <Field label="Yükleme modu">
              {(id) => (
                <select id={id} className="select" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                  <option value="upsert">Güncelle / ekle (önerilen)</option>
                  <option value="stock_only">Sadece stok ve fiyat güncelle</option>
                  <option value="replace">Tümünü sil ve yeniden yükle</option>
                </select>
              )}
            </Field>
            <Field label="Varsayılan para birimi" hint="Dosyada kolon yoksa kullanılır">
              {(id) => (
                <select id={id} className="select" value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value as Currency)}>
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              )}
            </Field>
            <label className="check" style={{ alignSelf: 'end' }}>
              <input type="checkbox" checked={deactivateMissing} onChange={(e) => setDeactivateMissing(e.target.checked)} disabled={mode === 'replace'} /> Dosyada olmayan ürünleri pasife al
            </label>
            <Field label="Varsayılan marka">{(id) => <input id={id} className="input" value={defaultBrand} onChange={(e) => setDefaultBrand(e.target.value)} />}</Field>
            <Field label="Varsayılan kategori">{(id) => <input id={id} className="input" value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)} />}</Field>
          </div>

          <h3>Kolon eşleme</h3>
          <div className="mapping" role="group" aria-label="Kolon eşleme">
            {FIELDS.map((f) => (
              <div key={f.key} className="map-row">
                <label htmlFor={`map-${f.key}`}>
                  {f.label}
                  {f.required && <span aria-hidden> *</span>}
                </label>
                <select
                  id={`map-${f.key}`}
                  className="select"
                  value={mapping[f.key] ?? ''}
                  aria-required={f.required}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                >
                  <option value="">— eşlenmedi —</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                      {used.has(h) && mapping[f.key] !== h ? ' (kullanılıyor)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <h3>Önizleme (ilk {preview.rows.length} satır)</h3>
          <div className="table-wrap">
            <table className="table small">
              <thead>
                <tr>
                  {preview.headers.map((h) => (
                    <th key={h} className="nowrap">
                      {h}
                      {used.has(h) && <div className="badge ok" style={{ marginTop: 2 }}>{FIELDS.find((f) => mapping[f.key] === h)?.label}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className="nowrap truncate" style={{ maxWidth: 220 }}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row">
            <button className="btn" onClick={() => setPreview(null)}>
              Vazgeç
            </button>
            <span className="spacer" />
            <button className="btn primary" onClick={run} disabled={busy || !mapping.sku}>
              <Upload size={16} aria-hidden /> {num(preview.totalRows)} satırı içe aktar
            </button>
          </div>
        </section>
      )}

      {errors.length > 0 && (
        <section className="card" role="alert">
          <h3>Atlanan satırlar ({errors.length})</h3>
          <ul className="small" style={{ maxHeight: 200, overflow: 'auto' }}>
            {errors.slice(0, 200).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" style={{ padding: 0, overflow: 'hidden' }} aria-labelledby="logs-title">
        <h2 id="logs-title" style={{ padding: '14px 16px 0' }}>
          Geçmiş yüklemeler
        </h2>
        {logs.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>
            Henüz yükleme yapılmadı.
          </p>
        ) : (
          <table className="table small">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Dosya</th>
                <th>Mod</th>
                <th className="right">Yeni</th>
                <th className="right">Güncel</th>
                <th className="right">Değişmedi</th>
                <th className="right">Pasif</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="nowrap">{date(l.created_at)}</td>
                  <td>{l.filename}</td>
                  <td>{l.mode}</td>
                  <td className="right">{num(l.inserted)}</td>
                  <td className="right">{num(l.updated)}</td>
                  <td className="right">{num(l.unchanged)}</td>
                  <td className="right">{num(l.deactivated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
