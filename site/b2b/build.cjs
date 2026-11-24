const fs = require('fs');
const ICON = '__B__icon.png';
const S = Object.fromEntries(['panel','katalog','arama','detay','sepet'].map(n => [n, `__B__s_${n}.webp`]));
const WIN = 'https://github.com/dumanonur42-rgb/ticimax-stok/releases/download/b2b-v1.0.30/Yamansa-Rulman-B2B-Kurulum-1.0.30.exe';
const PLAY = 'https://play.google.com/store/apps/details?id=com.yamansarulman.b2b';
const WA = 'https://wa.me/905526109363?text=' + encodeURIComponent('Merhaba, Yamansa B2B bayi hesabı açtırmak istiyorum.');
const LPURL = '/bayi-uygulamasi';
const svgPlay = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="#34A853" d="M3.6 1.8 13.7 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1z"/><path fill="#FBBC04" d="m17.1 8.6-3.4 3.4 3.4 3.4 3.9-2.2c.8-.5.8-1.7 0-2.2z"/><path fill="#4285F4" d="M3.6 1.8c.3-.2.8-.2 1.2 0l12.3 6.8-3.4 3.4z"/><path fill="#EA4335" d="m13.7 12 3.4 3.4-12.3 6.8c-.4.2-.9.2-1.2 0z"/></svg>`;
const svgApple = (c='#fff') => `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="${c}" d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8-1.7 0-3.2 1-4.1 2.5-1.8 3-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3-.1 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.5 1-1.4 1.3-2.7 1.4-2.8-.1 0-2.7-1-2.7-4.2zM14 5.2c.7-.8 1.1-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.2-.6 2.9-1.4z"/></svg>`;
const svgWin = (c='#fff') => `<svg viewBox="0 0 24 24" width="21" height="21"><path fill="${c}" d="M2 4.3 10 3.2v7.7H2zM11 3.1 22 1.5v9.4H11zM2 12h8v7.8l-8-1.1zM11 12h11v9.5l-11-1.6z"/></svg>`;
const svgAndroid = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="#34A853" d="M17.5 9.2 19.3 6a.4.4 0 0 0-.7-.4l-1.8 3.2a11.300 11.300 0 0 0-9.600 0L5.400 5.600a.4.4 0 0 0-.7.4l1.800 3.200A10.600 10.600 0 0 0 1 17.800h22a10.600 10.600 0 0 0-5.500-8.600zM7 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm10 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>`;
const ic = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffc400" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  stok: ic('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  fiyat: ic('<path d="M20.600 13.400 13.400 20.600a2 2 0 0 1-2.800 0L3 13V3h10l7.600 7.600a2 2 0 0 1 0 2.800z"/><circle cx="7.500" cy="7.500" r="1.300"/>'),
  ara: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.600-3.600"/>'),
  sepet: ic('<path d="M3 4h2.500l2.300 11h10.400l2-8H7"/><circle cx="9.500" cy="19" r="1.400"/><circle cx="17" cy="19" r="1.400"/>'),
  gecmis: ic('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
  offline: ic('<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>'),
  phone: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#0b1f4b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6.500" y="2.500" width="11" height="19" rx="2.500"/><path d="M11 18.500h2"/></svg>`,
  wa: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#fff" d="M12 2a10 10 0 0 0-8.600 15.100L2 22l5-1.300A10 10 0 1 0 12 2zm5.800 14.200c-.200.700-1.400 1.300-1.900 1.400-.500.100-1.100.100-1.800-.100-.400-.100-.900-.300-1.600-.600-2.800-1.200-4.600-4-4.700-4.200-.100-.200-1.100-1.500-1.100-2.900s.700-2 1-2.300c.200-.300.500-.300.700-.300h.500c.200 0 .400 0 .600.500l.900 2.100c.100.200.100.400 0 .500l-.300.500-.400.500c-.100.100-.300.300-.100.600.200.300.800 1.300 1.700 2.100 1.100 1 2.100 1.300 2.400 1.500.300.100.500.100.600-.100l.800-1c.200-.300.400-.200.600-.100l2 .900c.300.100.500.200.500.300.100.200.100.700-.100 1.300z"/></svg>`,
  tel: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0b1f4b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#55607c" stroke-width="2.200" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.600-3.600"/></svg>`
};
const fix = (s) => s;
const badge = (href, icon, small, big, cls='', soon=false) => `<a class="yb-badge ${cls}${soon?' soon':''}" href="${href}">${icon}<span><small>${small}</small><b>${big}</b></span>${soon?'<em>Yakında</em>':''}</a>`;
const BADGES = badge(PLAY, svgPlay, "GET IT ON", "Google Play") + badge('#', svgApple(), "Download on the", "App Store", '', true) + badge(WIN, svgWin(), "Windows için", "İndir (PC)", 'win');
const phone = (src, alt) => `<div class="yb-ph"><img src="${src}" alt="${alt}" width="520" height="1156" loading="lazy" decoding="async"></div>`;
const rows = [['6205 2RS','SKF','25×52×15','124','€3,20',1],['6205 ZZ','FAG','25×52×15','86','€2,95'],['6205 2RS C3','NSK','25×52×15','48','€3,05'],['6205 TN','KOYO','25×52×15','12','€2,70'],['6205 N','ZKL','25×52×15','Az: 2','€2,40'],['6205 2Z','NTN','25×52×15','31','€2,90'],['6205 RS','ORS','25×52×15','210','€1,85']];
const WINDOW = `<div class="yb-win" aria-hidden="true">
 <div class="yb-win-bar"><img src="${ICON}">Yamansa Rulman B2B<u><span>—</span><span>☐</span><span>✕</span></u></div>
 <div class="yb-win-nav"><b>YAMANSA</b><i>BAYİ PORTALI</i><span>Ana Sayfa</span><span class="on">Ürünler</span><span>Sepet</span><span>Siparişler</span><em>Örnek Bayi</em></div>
 <div class="yb-win-s">${I.search}6205</div>
 <table><tr><th>Ürün Kodu</th><th>Marka</th><th>d × D × B</th><th class="r">Stok</th><th class="r">Fiyat</th><th></th></tr>
 ${rows.map(r => `<tr${r[5]?' class="sel"':''}><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="r"><span class="yb-st${/Az/.test(r[3])?' low':''}">${r[3]}</span></td><td class="r"><b>${r[4]}</b></td><td class="r"><span class="yb-add${r[5]?' p':''}">+ Sepet</span></td></tr>`).join('')}
 </table></div>`;
const LP = fix(`<div class="yb-lp">
<div class="yb-crumb">Anasayfa › <b>Bayi Uygulaması</b></div>
<div class="yb-hero">
 <div><span class="yb-kicker">YAMANSA B2B · BAYİLERİMİZE ÖZEL</span>
  <h1>Stok, bayi fiyatı ve sipariş<span>cebinizde ve bilgisayarınızda</span></h1>
  <p class="yb-lead">Yamansa Rulman bayileri 9.000'den fazla ürünün stok durumunu ve kendilerine özel fiyatını anında görür, siparişini birkaç saniyede verir.</p>
  <div class="yb-badges">${BADGES}</div>
  <a class="yb-winlink" href="${WIN}">${svgWin()} Bilgisayar için Windows sürümü</a>
  <ul class="yb-ticks"><li>Ücretsiz</li><li>Tek hesap, tüm cihazlar</li><li>İnternetsiz katalog</li></ul>
  <div class="yb-note">Uygulama kayıtlı bayilerimiz içindir. Hesabınız yoksa <a href="${WA}">WhatsApp'tan bayi hesabı isteyin</a>.</div>
 </div>
 <div class="yb-vis">${WINDOW}${phone(S.katalog,'Yamansa B2B ürün kataloğu')}</div>
</div>
<div class="yb-stats"><div><b>9.000<span>+</span></b><small>ürün, güncel stok bilgisiyle</small></div><div><b>50<span>+</span></b><small>rulman ve güç aktarım markası</small></div><div><b>3</b><small>platform: Android, iPhone, Windows</small></div><div><b>7/24</b><small>sipariş, mesai saati beklemeden</small></div></div>

<h2 class="yb-h">Uygulamada neler var?</h2>
<p class="yb-sub">Telefonla fiyat ve stok sormaya gerek kalmadan, işinizi tek ekrandan yürütün.</p>
<div class="yb-feats">
 <div class="yb-card"><div class="yb-ic">${I.stok}</div><b>Anlık stok durumu</b><p>Ürünün stokta olup olmadığını ve kaç adet bulunduğunu anında görün.</p></div>
 <div class="yb-card"><div class="yb-ic">${I.fiyat}</div><b>Size özel bayi fiyatı</b><p>Firmanıza tanımlanan fiyatlar her üründe kendiliğinden görünür.</p></div>
 <div class="yb-card"><div class="yb-ic">${I.ara}</div><b>Hızlı arama</b><p>Ürün kodu, marka ya da iç çap / dış çap / genişlik ile saniyeler içinde bulun.</p></div>
 <div class="yb-card"><div class="yb-ic">${I.sepet}</div><b>Sepet ve sipariş</b><p>Ürünleri sepete ekleyin, notunuzu yazın ve siparişinizi tek dokunuşla gönderin.</p></div>
 <div class="yb-card"><div class="yb-ic">${I.gecmis}</div><b>Sipariş geçmişi</b><p>Verdiğiniz siparişleri ve durumlarını tek ekranda takip edin.</p></div>
 <div class="yb-card"><div class="yb-ic">${I.offline}</div><b>İnternetsiz katalog</b><p>Bağlantı olmasa da katalog açılır; internet gelince kendiliğinden güncellenir.</p></div>
</div>

<div class="yb-shots"><h2 class="yb-h">Uygulamadan görüntüler</h2><p class="yb-sub">Telefonda ve bilgisayarda aynı sade, hızlı ekranlar.</p>
 <div class="yb-shots-row">
  <div class="yb-shot">${phone(S.panel,'Bayi paneli')}<b>Bayi paneli</b><span>Ürün, sepet ve siparişleriniz tek bakışta</span></div>
  <div class="yb-shot">${phone(S.arama,'Ürün arama')}<b>Ürün arama</b><span>Kodu yazın, sonuçlar anında gelsin</span></div>
  <div class="yb-shot">${phone(S.detay,'Ürün detayı')}<b>Ürün detayı</b><span>Stok adedi ve fiyat bir arada</span></div>
  <div class="yb-shot">${phone(S.sepet,'Sepet')}<b>Sepet</b><span>Adedi belirleyin, siparişi gönderin</span></div>
 </div></div>

<h2 class="yb-h">Cihazınıza indirin</h2>
<p class="yb-sub">Aynı kullanıcı adı ve şifreyle bütün cihazlarınızda giriş yapabilirsiniz.</p>
<div class="yb-plats">
 <div class="yb-plat"><div class="yb-ic">${svgAndroid}</div><b>Android</b><p>Android telefon ve tabletler için Google Play'den indirin.</p>${badge(PLAY, svgPlay, "GET IT ON", "Google Play")}<small>Android 7 ve üzeri</small></div>
 <div class="yb-plat"><div class="yb-ic">${svgApple('#0b1f4b')}</div><b>iPhone</b><p>iPhone sürümü Apple onayında. Yayınlandığında buradan indirebileceksiniz.</p>${badge('#', svgApple(), "Download on the", "App Store", '', true)}<small>Çok yakında</small></div>
 <div class="yb-plat"><div class="yb-ic">${svgWin('#0b1f4b')}</div><b>Windows</b><p>Ofis bilgisayarınız için kurulum dosyasını indirin; güncellemeler kendiliğinden gelir.</p>${badge(WIN, svgWin(), "Windows için", "İndir (PC)")}<small>Windows 10 ve 11</small></div>
</div>

<h2 class="yb-h">Nasıl başlarım?</h2>
<p class="yb-sub">Üç adımda kullanmaya başlayın.</p>
<div class="yb-steps">
 <div class="yb-step"><div class="yb-num">1</div><b>Bayi hesabı isteyin</b><p>WhatsApp, telefon veya e-posta ile firma bilgilerinizi bize iletin.</p></div>
 <div class="yb-step"><div class="yb-num">2</div><b>Uygulamayı indirin</b><p>Telefonunuza veya bilgisayarınıza uygun sürümü yukarıdan indirin.</p></div>
 <div class="yb-step"><div class="yb-num">3</div><b>Giriş yapın</b><p>Size verdiğimiz kullanıcı adı ve şifreyle girin, sipariş vermeye başlayın.</p></div>
</div>

<h2 class="yb-h" style="margin-bottom:26px">Sık sorulan sorular</h2>
<div class="yb-faq">
 <details open><summary>Uygulama ücretli mi?</summary><p>Hayır. Uygulama bayilerimiz için tamamen ücretsizdir.</p></details>
 <details><summary>Kimler kullanabilir?</summary><p>Yamansa Rulman'dan alım yapan firmalar: bayiler, satıcılar ve tamir atölyeleri. Bayi hesabını biz açıyoruz; uygulamanın içinden kayıt olunmaz.</p></details>
 <details><summary>Aynı hesabı telefonda ve bilgisayarda kullanabilir miyim?</summary><p>Evet. Aynı kullanıcı adı ve şifreyle Android, iPhone ve Windows'ta giriş yapabilirsiniz.</p></details>
 <details><summary>İnternet yokken çalışır mı?</summary><p>Katalog internetsiz de açılır. Güncel stok ve sipariş göndermek için internet gerekir.</p></details>
 <details><summary>Şifremi unuttum, ne yapmalıyım?</summary><p>Bize WhatsApp'tan veya telefonla ulaşın, şifrenizi yenileyelim.</p></details>
</div>

<div class="yb-cta"><div><b class="t">Henüz bayimiz değil misiniz?</b><p>Firma bilgilerinizi gönderin, bayi hesabınızı açalım. Sorularınız için bize her zaman ulaşabilirsiniz.</p></div>
 <div class="yb-cta-b"><a class="yb-btn wa" href="${WA}">${I.wa} WhatsApp'tan bayi ol</a><a class="yb-btn tel" href="tel:+905526109363">${I.tel} 0552 610 93 63</a><a class="yb-btn mail" href="mailto:info@yamansarulman.com">${I.mail} E-posta</a></div></div>
</div>`);
const FSTRIP = fix(`<div class="yb-fstrip" id="yb-foot"><div class="yb-fstrip-in"><div class="yb-fstrip-l"><img class="yb-fstrip-ic" src="${ICON}" alt=""><div><div class="yb-fstrip-t">Yamansa B2B Bayi Uygulaması<i>YENİ</i></div><div class="yb-fstrip-s">Stok, bayi fiyatı ve sipariş · Android, iPhone ve Windows<a href="${LPURL}">Detaylı bilgi →</a></div></div></div><div class="yb-badges">${BADGES}</div><a class="yb-fstrip-m" href="${LPURL}">Windows sürümü ve detaylar →</a></div></div>`);

const TOP = `<a class="yb-top-link" href="${LPURL}">${I.phone} Bayi Uygulaması <i>YENİ</i></a>`;
const HEAD = `<a class="yb-head-btn" href="${LPURL}"><img src="${ICON}" alt="" width="32" height="32"><span><small>Bayilere özel</small>B2B Uygulama</span></a>`;
const min = (s) => s.replace(/\n\s*/g, '');
const J = (s) => JSON.stringify(min(s)).replace(/__B__/g, '"+B+"');
const js = `/* Yamansa B2B bayi uygulamasi tanitimi: ust serit baglantisi, menu dugmesi, footer seridi, /bayi-uygulamasi sayfasi */
(function(){
if(window.__ybB2B)return;window.__ybB2B=1;
var B=((document.currentScript&&document.currentScript.src)||"").replace(/[^\\/]*$/,"");
var TOP=${J(TOP)},HEAD=${J(HEAD)},FS=${J(FSTRIP)},LP=${J(LP)};
var isLP=/^\\/bayi-uygulamasi\\/?$/i.test(location.pathname),ready=false,t0=Date.now();
var l=document.createElement("link");l.rel="stylesheet";l.href=B+"b2b.css";l.onload=function(){ready=true;run()};l.onerror=function(){ready=true};
(document.head||document.documentElement).appendChild(l);
function ins(sel,pos,html,mark){var el=document.querySelector(sel);if(!el||document.querySelector(mark))return;el.insertAdjacentHTML(pos,html)}
function run(){
if(!ready)return;
ins(".yr-banner","beforeend",TOP,".yb-top-link");
ins("#divHeaderUyeV2","beforebegin",HEAD,".yb-head-btn");
ins("footer","beforebegin",FS,".yb-fstrip");
if(isLP&&!document.querySelector(".yb-lp")){var c=document.querySelector("#yb-lp-root")||document.querySelector("#divIcerik");if(c){c.innerHTML=LP;document.documentElement.classList.add("yb-lp-page")}}
}
function loop(){run();var done=document.querySelector(".yb-top-link")&&document.querySelector(".yb-head-btn")&&document.querySelector(".yb-fstrip")&&(!isLP||document.querySelector(".yb-lp"));if(!done&&Date.now()-t0<20000)setTimeout(loop,250)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",loop);else loop();
})();
`;
fs.writeFileSync(__dirname + '/b2b.js', js);
let css = fs.readFileSync(__dirname + '/b2b.src.css', 'utf8');
css = css.slice(0, css.indexOf('/* mockup işaretleri */'));
css += '/* telefon tasarımı onaylanana kadar footer şeridi yalnızca masaüstünde */\n@media (max-width:1023px){.yb-fstrip{display:none!important}}\n';
fs.writeFileSync(__dirname + '/b2b.css', css);
console.log('js', js.length, 'css', css.length);
