import type { ReactNode } from 'react'
import { useApp } from '@/store/app'

const K = ({ children }: { children: ReactNode }): ReactNode => <kbd>{children}</kbd>

export function Help(): ReactNode {
  const isAdmin = useApp((s) => s.session?.user.role === 'admin')
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
        {isAdmin ? (
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
              <b>Her yerden aynı veri:</b> Ürün, stok, bayi ve siparişler ortak bulut veritabanındadır; bayilerin siparişleri anında burada görünür. Ayarlar →
              Bulut & Veri'den bağlantı durumunu görebilir, "arka planda çalış" seçeneğiyle pencere kapalıyken de yeni sipariş bildirimi alabilirsiniz.
            </li>
          </ol>
        ) : (
          <ol style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li>
              <b>Ürün arayın:</b> Ürünler sayfasında stok kodu, marka, barkod veya muadil kodla arayın; d × D × B ölçüsüne göre filtreleyin.
            </li>
            <li>
              <b>Sepete ekleyin:</b> Satırdaki <K>+</K> ile ürünü sepete atın, miktarı sepette düzenleyin.
            </li>
            <li>
              <b>Sipariş oluşturun:</b> Sepette ödeme şeklini seçip siparişi gönderin; durumunu Siparişler sayfasından takip edin, gerekirse yazdırın.
            </li>
          </ol>
        )}
        <h3>Arama ipuçları</h3>
        <ul style={{ paddingLeft: 20, display: 'grid', gap: 4 }}>
          <li>
            Boşluk, tire ve nokta önemsizdir: <code>6205 2RS</code>, <code>6205-2RS</code>, <code>62052rs</code> aynı sonucu verir.
          </li>
          <li>Ölçü filtreleri milimetre cinsindedir; yalnızca iç çap girerek de arayabilirsiniz.</li>
          <li>Türkçe karakter duyarsızdır (Keçe / KECE).</li>
        </ul>
      </section>

      <section className="card grid" style={{ gap: 10 }} aria-labelledby="h-secure">
        <h2 id="h-secure">Güvenlik ve kurulum</h2>
        <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>
            <b>Windows "Bilgisayarınız korundu" uyarısı:</b> kurulum dosyası dijital imzalı olmadığı için ilk çalıştırmada çıkabilir. <b>Daha fazla bilgi → Yine
            de çalıştır</b> ile devam edin; dosya bilgilerinde (sağ tık → Özellikler → Ayrıntılar) şirket adı <b>Yamansa Rulman</b> yazmalıdır.
          </li>
          <li>
            <b>"Uygulama denetim ilkesi tarafından engellendi":</b> kurulumda <b>"Bu bilgisayarı kullanan herkes için"</b> seçeneğini (varsayılan) bırakıp
            Program Files'a kurun; şirket bilgisayarlarındaki ilkeler çoğunlukla yalnızca Program Files'a izin verir. Kişisel Windows 11'de hata sürüyorsa
            neden <b>Akıllı Uygulama Denetimi</b>'dir (Windows Güvenliği → Uygulama ve tarayıcı denetimi); kapatma kararı bilgisayar sahibine aittir.
          </li>
          <li>
            <b>Doğrulama:</b> her sürümün GitHub Releases sayfasında kurulum dosyasının SHA-256 özeti yazar; PowerShell'de <code>Get-FileHash</code> ile
            karşılaştırabilirsiniz.
          </li>
          <li>
            <b>Verileriniz:</b> giriş, ürün ve siparişler yalnızca Yamansa'nın bulut veritabanıyla şifreli (HTTPS) konuşur; kimin neyi görebileceği sunucuda
            uygulanır, bayi yalnızca kendi verisini görür. Uygulama içinde dış web sayfası gösterilmez (bağlantılar tarayıcınızda açılır), kamera/mikrofon gibi izin istenmez.
          </li>
          <li>
            <b>Güncellemeler</b> yalnızca resmî GitHub Releases sayfasından alınır ve siz onaylamadan kurulmaz.
          </li>
          {isAdmin ? (
            <li>
              <b>[Yönetici]</b> Ayrıntılı kurulum rehberi ve güvenlik duvarı adresleri için depodaki <code>b2b-app/KURULUM.md</code> dosyasına bakın; Defender yanlış
              alarm verirse dosyayı Microsoft'a "yanlışlıkla algılandı" olarak bildirebilirsiniz.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  )
}
