import type { ReactNode } from 'react'
import { ChevronRight, Headset, MessageCircle, Phone, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { normalize } from '@shared/identity'
import { api } from '@/lib/api'
import { useApp } from '@/store/app'
import './settings.css'

type HelpItem = {
  title: string
  text: string
  search?: string
}

type Shortcut = {
  keys: string[][]
  text: string
  search?: string
}

const adminSteps: HelpItem[] = [
  { title: 'Stok listenizi yükleyin', text: 'İçe Aktar’dan Excel veya CSV seçin; stok kodu zorunludur.', search: 'ürün stok içe aktar dosya' },
  { title: 'Bayilerinizi ekleyin', text: 'Firma, iskonto ve para birimini tanımlayın.', search: 'bayi firma fiyat para birimi' },
  { title: 'Bayi kullanıcıları açın', text: 'Ayarlar → Kullanıcılar’da kullanıcıyı bayiye bağlayın.', search: 'kullanıcı rol bayi ayarlar' },
  { title: 'Sipariş alın', text: 'Ürün arayın, sepete ekleyin ve siparişi oluşturun.', search: 'ürün arama sepet sipariş' },
  { title: 'Stokları güncelleyin', text: 'Yeni listeyi “Sadece stok ve fiyat güncelle” ile yükleyin.', search: 'stok fiyat güncelle' },
  { title: 'Bulut ayarlarını kontrol edin', text: 'Bağlantı ve arka plan bildirimlerini Bulut & Veri’den görün.', search: 'bulut internet bağlantı bildirim arka plan' }
]

const dealerSteps: HelpItem[] = [
  { title: 'Ürünleri bulun', text: 'Kod, marka, barkod veya ölçüyle arayın.', search: 'ürün stok kodu marka barkod muadil ölçü' },
  { title: 'Sepete ekleyin', text: 'Sepette ürün miktarını düzenleyin.', search: 'sepet miktar' },
  { title: 'Siparişi gönderin', text: 'Ödeme şeklini seçin, siparişi gönderip durumunu izleyin.', search: 'sipariş ödeme gönder takip' }
]

const generalShortcuts: Shortcut[] = [
  { keys: [['Ctrl', 'K'], ['F3']], text: 'Ürün aramaya odaklan', search: 'arama ürün ara' },
  { keys: [['F2']], text: 'Sepeti aç', search: 'sepet' },
  { keys: [['F1']], text: 'Yardım sayfasını aç', search: 'yardım yardım sayfası' },
  { keys: [['Alt', '1–8']], text: 'Sayfalar arasında geçiş yap', search: 'sayfa gezinme' },
  { keys: [['Ctrl', '+'], ['Ctrl', '−'], ['Ctrl', '0']], text: 'Yazı boyutunu büyüt, küçült veya sıfırla', search: 'yazı boyutu font' },
  { keys: [['Esc']], text: 'Açık paneli veya pencereyi kapat', search: 'panel pencere kapat' }
]

const productShortcuts: Shortcut[] = [
  { keys: [['↑', '↓', 'Home', 'End', 'PgUp', 'PgDn']], text: 'Ürün listesinde gezin', search: 'yukarı aşağı home end pageup pagedown' },
  { keys: [['Enter']], text: 'Seçili ürünün ayrıntısını aç', search: 'ürün detay' },
  { keys: [['+']], text: 'Seçili ürünü sepete ekle', search: 'ürün sepet ekle' }
]

const searchTips: HelpItem[] = [
  { title: 'Kod biçimi', text: '6205 2RS = 6205-2RS = 62052rs', search: 'boşluk tire nokta kod aynı sonuç' },
  { title: 'Ölçüler', text: 'Ölçüler milimetredir; yalnızca iç çapı girerek de arayabilirsiniz.', search: 'milimetre mm iç çap ölçü' },
  { title: 'Türkçe karakterler', text: 'Keçe ve KECE aynı sonucu verir.', search: 'türkçe karakter duyarsız' }
]

const faq: HelpItem[] = [
  { title: 'Güncellemeler nasıl gelir?', text: 'Güncelleme arka planda iner. Pencere küçültülünce, kapatılınca ya da 5 dakika boşta kalınca kurulur; oturumunuz kapanmaz.', search: 'update güncelleme sessiz kurulum' },
  { title: 'İnternet yokken çalışır mı?', text: 'Ürün listesi ve arama çalışır. Siparişler bağlantı gelince gönderilir.', search: 'çevrimdışı offline bağlantı sipariş' },
  { title: 'Şifremi unuttum', text: 'Şifrenizi yenilemesi için yöneticinize başvurun.', search: 'şifre parola unutma sıfırlama yönetici' },
  { title: 'Bilgisayardaki veriler güvende mi?', text: 'Bulut bağlantısı HTTPS kullanır. Bu bilgisayardaki ürün kopyası şifrelidir ve çıkış yapınca silinir.', search: 'yerel veri katalog ürün şifreli güvenlik çıkış' }
]

const securityItems: HelpItem[] = [
  { title: '“Bilgisayarınız korundu” uyarısı', text: 'Kurulum dosyasını resmî Yamansa kaynağından aldıysanız Daha fazla bilgi → Yine de çalıştır ile devam edebilirsiniz.', search: 'windows defender smartscreen kurulum' },
  { title: 'Uygulama denetim ilkesi engelliyor', text: 'Kurumsal bilgisayarda kurulum için sistem yöneticinizden yardım isteyin.', search: 'program files akıllı uygulama denetimi windows' },
  { title: 'Dosyayı doğrulama', text: 'GitHub Releases sayfasındaki SHA-256 değerini PowerShell’de Get-FileHash ile karşılaştırın.', search: 'sha256 hash github doğrulama' }
]

const allHelpItems = [...adminSteps, ...dealerSteps, ...generalShortcuts.map((item) => ({ title: item.text, text: item.search ?? '' })), ...productShortcuts.map((item) => ({ title: item.text, text: item.search ?? '' })), ...searchTips, ...faq, ...securityItems]
const KeySets = ({ sets }: { sets: string[][] }): ReactNode => (
  <span className="help-keysets">
    {sets.map((set, setIndex) => (
      <span className="help-keyset" key={`${setIndex}-${set.join('-')}`}>
        {setIndex > 0 && <span className="help-key-or">/</span>}
        {set.map((key, keyIndex) => (
          <span className="help-key-item" key={key}>
            {keyIndex > 0 && <span className="help-key-plus">+</span>}
            <kbd className="help-key">{key}</kbd>
          </span>
        ))}
      </span>
    ))}
  </span>
)

export function Help(): ReactNode {
  const isAdmin = useApp((state) => state.session?.user.role === 'admin')
  const [query, setQuery] = useState('')
  const q = useMemo(() => normalize(query.trim()), [query])
  const matches = (...values: string[]): boolean => !q || normalize(values.join(' ')).includes(q)
  const steps = isAdmin ? adminSteps : dealerSteps
  const visibleSteps = steps.filter((item) => matches(item.title, item.text, item.search ?? ''))
  const visibleGeneral = generalShortcuts.filter((item) => matches(item.text, item.search ?? '', item.keys.flat().join(' ')))
  const visibleProduct = productShortcuts.filter((item) => matches(item.text, item.search ?? '', item.keys.flat().join(' ')))
  const visibleTips = searchTips.filter((item) => matches(item.title, item.text, item.search ?? ''))
  const visibleFaq = faq.filter((item) => matches(item.title, item.text, item.search ?? ''))
  const visibleSecurity = securityItems.filter((item) => matches(item.title, item.text, item.search ?? ''))
  const showAllSteps = matches('Hızlı başlangıç')
  const showAllShortcuts = matches('Klavye kısayolları', 'Genel', 'Ürün listesi')
  const showAllTips = matches('Arama ipuçları')
  const showAllFaq = matches('Sık sorulan sorular')
  const showAllSecurity = matches('Güvenlik ve kurulum')
  const showSteps = showAllSteps || visibleSteps.length > 0
  const showShortcuts = showAllShortcuts || visibleGeneral.length > 0 || visibleProduct.length > 0
  const showTips = showAllTips || visibleTips.length > 0
  const showFaq = showAllFaq || visibleFaq.length > 0
  const showSecurity = showAllSecurity || visibleSecurity.length > 0
  const hasMatches = showSteps || showShortcuts || showTips || showFaq || showSecurity || matches('İletişim', 'telefon', 'WhatsApp', '+90 552 610 93 63')
  const open = (url: string): void => { void api('app:openExternal', url) }

  return (
    <div className="help-page">
      <section className="card help-header" aria-labelledby="help-title">
        <div>
          <h2 id="help-title">Yardım ve kısayollar</h2>
          <p>Aradığınız konuyu yazın veya aşağıdaki başlıklara göz atın.</p>
        </div>
        <label className="help-search">
          <Search size={18} aria-hidden />
          <span className="sr-only">Yardımda ara</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Yardımda ara" />
        </label>
      </section>

      <section className="card contact help-contact" aria-labelledby="help-contact-title">
        <header className="contact-head">
          <span className="contact-head-icon"><Headset size={22} aria-hidden /></span>
          <span>
            <h3 id="help-contact-title">Bize ulaşın</h3>
            <span className="muted small">Sorunuz olursa yazın ya da arayın.</span>
          </span>
        </header>
        <div className="help-contact-actions">
          <button
            className="help-contact-tile whatsapp"
            type="button"
            aria-label="WhatsApp'tan yazın: +90 552 610 93 63"
            onClick={() => open('https://wa.me/905526109363')}
          >
            <span className="help-contact-icon"><MessageCircle size={20} aria-hidden /></span>
            <span className="help-contact-copy">
              <strong>WhatsApp'tan yazın</strong>
              <span className="contact-number">+90 552 610 93 63</span>
            </span>
            <ChevronRight className="help-contact-arrow" size={20} aria-hidden />
          </button>
          <button
            className="help-contact-tile call"
            type="button"
            aria-label="Hemen arayın: +90 552 610 93 63"
            onClick={() => open('tel:+905526109363')}
          >
            <span className="help-contact-icon"><Phone size={20} aria-hidden /></span>
            <span className="help-contact-copy">
              <strong>Hemen arayın</strong>
              <span className="contact-number">+90 552 610 93 63</span>
            </span>
            <ChevronRight className="help-contact-arrow" size={20} aria-hidden />
          </button>
        </div>
      </section>

      <div className="help-grid">
        {showSteps && (
          <section className="card help-card" aria-labelledby="help-steps-title">
            <h2 id="help-steps-title">Hızlı başlangıç</h2>
            <ol className="help-steps">
              {(showAllSteps ? steps : visibleSteps).map((step, index) => (
                <li className="help-step" key={step.title}>
                  <span className="help-step-number" aria-hidden>{index + 1}</span>
                  <span className="help-step-copy">
                    <strong>{step.title}</strong>
                    <span>{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {showShortcuts && (
          <section className="card help-card" aria-labelledby="help-shortcuts-title">
            <h2 id="help-shortcuts-title">Klavye kısayolları</h2>
            {(showAllShortcuts || visibleGeneral.length > 0) && (
              <div className="help-shortcut-group">
                <h3>Genel</h3>
                <div className="help-shortcut-list">
                  {(showAllShortcuts ? generalShortcuts : visibleGeneral).map((item) => (
                    <div className="help-shortcut-row" key={item.text}>
                      <KeySets sets={item.keys} />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(showAllShortcuts || visibleProduct.length > 0) && (
              <div className="help-shortcut-group">
                <h3>Ürün listesi</h3>
                <div className="help-shortcut-list">
                  {(showAllShortcuts ? productShortcuts : visibleProduct).map((item) => (
                    <div className="help-shortcut-row" key={item.text}>
                      <KeySets sets={item.keys} />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {showTips && (
          <section className="card help-card" aria-labelledby="help-tips-title">
            <h2 id="help-tips-title">Arama ipuçları</h2>
            <div className="help-tip-list">
              {(showAllTips ? searchTips : visibleTips).map((item) => (
                <div className="help-tip" key={item.title}>
                  <strong>{item.title}</strong>
                  {item.title === 'Kod biçimi' ? (
                    <div className="help-code-equivalence" aria-label="Kod biçimleri eşdeğerdir">
                      <code>6205 2RS</code><span>=</span><code>6205-2RS</code><span>=</span><code>62052rs</code>
                    </div>
                  ) : <span>{item.text}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {showFaq && (
          <section className="card help-card" aria-labelledby="help-faq-title">
            <h2 id="help-faq-title">Sık sorulan sorular</h2>
            <div className="help-accordion-list">
              {(showAllFaq ? faq : visibleFaq).map((item) => (
                <details className="help-accordion" key={item.title}>
                  <summary>{item.title}</summary>
                  <p>{item.text}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {showSecurity && (
          <section className="card help-card" aria-labelledby="help-security-title">
            <h2 id="help-security-title">Güvenlik ve kurulum</h2>
            <div className="help-accordion-list">
              {(showAllSecurity ? securityItems : visibleSecurity).map((item) => (
                <details className="help-accordion" key={item.title}>
                  <summary>{item.title}</summary>
                  <p>{item.text}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {q && !hasMatches && <section className="card help-no-results" role="status">Aramanızla eşleşen içerik bulunamadı.</section>}
      </div>
    </div>
  )
}
