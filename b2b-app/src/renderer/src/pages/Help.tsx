import type { ReactNode } from 'react'

const K = ({ children }: { children: ReactNode }): ReactNode => <kbd>{children}</kbd>

export function Help(): ReactNode {
  return (
    <div className="grid g2" style={{ gap: 18, alignItems: 'start' }}>
      <section className="card" aria-labelledby="h-keys">
        <h2 id="h-keys">Klavye kısayolları</h2>
        <table className="table small">
          <tbody>
            <tr>
              <td>
                <K>Ctrl</K>+<K>K</K> / <K>F3</K>
              </td>
              <td>Ürün aramaya odaklan</td>
            </tr>
            <tr>
              <td>
                <K>F2</K>
              </td>
              <td>Sepeti aç</td>
            </tr>
            <tr>
              <td>
                <K>F1</K>
              </td>
              <td>Bu yardım sayfası</td>
            </tr>
            <tr>
              <td>
                <K>Alt</K>+<K>1</K>…<K>8</K>
              </td>
              <td>Sayfalar arasında geçiş</td>
            </tr>
            <tr>
              <td>
                <K>Ctrl</K>+<K>+</K> / <K>−</K> / <K>0</K>
              </td>
              <td>Yazı boyutu büyüt / küçült / sıfırla</td>
            </tr>
            <tr>
              <td>
                <K>↑</K> <K>↓</K> <K>Home</K> <K>End</K> <K>PgUp</K> <K>PgDn</K>
              </td>
              <td>Ürün listesinde gezin</td>
            </tr>
            <tr>
              <td>
                <K>Enter</K>
              </td>
              <td>Seçili ürünün ayrıntısını aç</td>
            </tr>
            <tr>
              <td>
                <K>+</K>
              </td>
              <td>Seçili ürünü sepete ekle</td>
            </tr>
            <tr>
              <td>
                <K>Esc</K>
              </td>
              <td>Paneli / pencereyi kapat</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card grid" style={{ gap: 10 }} aria-labelledby="h-flow">
        <h2 id="h-flow">Hızlı başlangıç</h2>
        <ol style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>
            <b>Stok listenizi yükleyin:</b> İçe Aktar sayfasından Excel/CSV dosyanızı seçin. Kolonlar otomatik eşlenir; sadece <i>Stok kodu</i> zorunludur.
          </li>
          <li>
            <b>Bayilerinizi ekleyin:</b> Bayiler sayfasında firma, iskonto ve para birimi tanımlayın.
          </li>
          <li>
            <b>Bayi kullanıcıları açın:</b> Ayarlar → Kullanıcılar'dan "Bayi" rolüyle kullanıcı oluşturup bayiye bağlayın. Bayi yalnızca kendi siparişlerini görür.
          </li>
          <li>
            <b>Sipariş alın:</b> Ürünlerde arayın (stok kodu, ürün adı, marka, barkod, muadil), ölçüye göre filtreleyin, <K>+</K> ile sepete ekleyin, siparişi oluşturun.
          </li>
          <li>
            <b>Stok güncelleyin:</b> Yeni stok listesini "Sadece stok ve fiyat güncelle" moduyla yükleyin; siparişler stoktan otomatik düşer.
          </li>
          <li>
            <b>Yedek alın:</b> Ayarlar → Yedekleme'den tek dosya olarak yedekleyin, başka bilgisayara taşıyın.
          </li>
        </ol>
        <h3>Arama ipuçları</h3>
        <ul style={{ paddingLeft: 20, display: 'grid', gap: 4 }}>
          <li>
            Boşluk, tire ve nokta önemsizdir: <code>6205 2RS</code>, <code>6205-2RS</code>, <code>62052rs</code> aynı sonucu verir.
          </li>
          <li>Ölçü filtreleri milimetre cinsindedir; yalnızca iç çap girerek de arayabilirsiniz.</li>
          <li>Türkçe karakter duyarsızdır (Keçe / KECE).</li>
        </ul>
      </section>
    </div>
  )
}
