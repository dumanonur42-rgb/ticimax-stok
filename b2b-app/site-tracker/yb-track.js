(function () {
  'use strict';
  var endpoint = '__YB_TRACK_ENDPOINT__';
  var q = [], vid = '', sid = '', device = '', ref = '', timer = 0, busy = false;
  var perf = false, work = 0;

  function safe(fn) {
    return function (event) {
      var measure = perf, start = measure ? performance.now() : 0;
      try { fn(event); } catch (_) {}
      if (measure) work += performance.now() - start;
    };
  }
  function randomId() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    var raw = '';
    for (var i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function touch() {
    try { sessionStorage.setItem('yb_sid', sid + ':' + Date.now()); } catch (_) {}
  }
  function add(kind, data) {
    if (q.length >= 100) return;
    touch();
    q.push({ k: kind, at: Date.now(), s: data.s || '', n: data.n || '', p: data.p || '', q: data.q || '', c: Number.isInteger(data.c) ? data.c : null, x: Number.isFinite(data.x) ? data.x : null });
    if (!timer) timer = window.setInterval(safe(function () { if (q.length) flush(false); else { clearInterval(timer); timer = 0; } }), 10_000);
  }
  function flush(beacon) {
    if (!q.length || (busy && !beacon)) return;
    var events = q.slice(0, 25), body = '';
    while (events.length) {
      body = JSON.stringify({ v: vid, d: device, r: ref, e: events.map(function (item) {
        return { k: item.k, t: Math.max(0, Math.min(600_000, Date.now() - item.at)), s: item.s, n: item.n, p: item.p, q: item.q, c: item.c, x: item.x };
      }) });
      if (new Blob([body]).size <= 15_000) break;
      events.pop();
    }
    if (!events.length) return;
    if (beacon) {
      try { if (navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain' }))) q.splice(0, events.length); } catch (_) {}
    } else {
      busy = true;
      fetch(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body })
        .then(function (response) { if (response.ok || response.status === 204) q.splice(0, events.length); })
        .catch(function () {}).then(safe(function () { busy = false; }));
    }
    if (!q.length && timer) { clearInterval(timer); timer = 0; }
  }
  function path(search) { return (location.pathname + (search ? location.search : '')).slice(0, 300); }
  function norm(text) { return text.toLocaleLowerCase('tr-TR').replace(/[\s.\-/_]+/g, ''); }
  function trackSearch(text, count) {
    text = String(text || '').trim().slice(0, 100);
    if (!text) return;
    var key = norm(text);
    try { if (sessionStorage.getItem('yb_search') === key) return; sessionStorage.setItem('yb_search', key); } catch (_) {}
    add('search', { q: text, p: path(true), c: count });
  }
  function productData() {
    var sku = '', name = '';
    try {
      var node = document.querySelector('.sku,[itemprop="sku"]');
      sku = node ? (node.getAttribute('content') || node.textContent || '').trim() : '';
      var title = document.querySelector('h1.product_title,h1');
      name = title ? title.textContent.trim() : '';
      if (!sku) {
        var gtm = document.querySelector('.gtm4wp_single_productdata');
        if (gtm) { var data = JSON.parse(gtm.getAttribute('data-gtm4wp_product_data') || '{}'); sku = data.sku || ''; name = name || data.item_name || ''; }
      }
      if (!sku) {
        var json = document.querySelectorAll('script[type="application/ld+json"]');
        for (var i = 0; i < json.length && !sku; i++) {
          var data2 = JSON.parse(json[i].textContent || '{}'), items = data2['@graph'] || [data2];
          for (var j = 0; j < items.length; j++) if (items[j].sku) { sku = items[j].sku; name = name || items[j].name || ''; break; }
        }
      }
    } catch (_) {}
    return { s: String(sku).trim().slice(0, 80), n: String(name).trim().slice(0, 160) };
  }
  function viewProduct(item) {
    if (!item.s) return;
    try {
      var key = 'yb_pv_' + item.s, last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last < 60_000) return;
      localStorage.setItem(key, String(Date.now()));
    } catch (_) {}
    add('product_view', { s: item.s, n: item.n, p: path(false) });
  }
  function cartAdd(sku, qty, name) {
    var key = 'yb_ca', now = Date.now();
    try {
      var last = (sessionStorage.getItem(key) || '').split('|');
      if (last[0] === sku && last[1] === String(qty) && now - Number(last[2]) < 1500) return;
      sessionStorage.setItem(key, sku + '|' + qty + '|' + now);
    } catch (_) {}
    add('cart_add', { s: sku, n: name, p: path(false), x: qty });
  }
  /*<WOO>*/
  function woo() {
    var params = new URLSearchParams(location.search), query = params.get('s');
    if (query && params.get('post_type') === 'product') {
      var empty = document.body.classList.contains('search-no-results') || /no products|ürün bulunamadı/i.test((document.querySelector('.woocommerce-info') || {}).textContent || '');
      trackSearch(query, empty ? 0 : document.querySelectorAll('ul.products li.product').length);
    }
    if (document.body.classList.contains('single-product')) viewProduct(productData());
    if (document.body.classList.contains('woocommerce-order-received')) {
      var order = location.pathname.match(/order-received\/([^/]+)/), id = order ? order[1] : location.pathname;
      try { if (!localStorage.getItem('yb_order_' + id)) { localStorage.setItem('yb_order_' + id, '1'); add('order', { p: path(false), x: 1 }); } } catch (_) {}
    }
    if (window.jQuery) try {
      window.jQuery(document.body).on('added_to_cart.ybTrack', safe(function (_, __, ___, button) {
        var node = button && (button[0] || button);
        if (node) cartAdd(node.getAttribute('data-product_sku') || '', Number(node.getAttribute('data-quantity') || 1), '');
      }));
    } catch (_) {}
    document.addEventListener('submit', safe(function (event) {
      var form = event.target;
      if (form && form.matches && form.matches('form.cart')) {
        var item = productData(), qty = Number((form.querySelector('input.qty') || {}).value || 1);
        cartAdd(item.s, Math.max(1, qty || 1), item.n);
      }
    }), { passive: true });
    document.addEventListener('click', safe(function (event) {
      var button = event.target.closest && event.target.closest('button.single_add_to_cart_button,input[type="submit"][name="add-to-cart"]');
      var form = button && button.closest('form.cart');
      if (!form) return;
      var item = productData(), qty = Number((form.querySelector('input.qty') || {}).value || 1);
      cartAdd(item.s, Math.max(1, qty || 1), item.n);
    }), { passive: true });
    if (location.hostname.indexOf('rulmansitesi') >= 0) document.addEventListener('click', safe(function (event) {
      var link = event.target.closest && event.target.closest('a[href*="wa.me"]');
      if (link && /sipariş|order/i.test(link.textContent + ' ' + link.className)) {
        add('order', { p: path(false), x: document.querySelectorAll('.cart_item').length || 1 });
      }
    }), { passive: true });
  }
  /*</WOO>*/
  /*<TICIMAX>*/
  function ticimax() {
    var params = new URLSearchParams(location.search), query = params.get('kelime');
    if (query) trackSearch(query, document.querySelectorAll('.productItem').length);
    var model = window.globalModel || {}, pageType = String(model.pageType || '');
    var detail = window.productDetailModel || {};
    var node = document.querySelector('#divUrunKodu,.urunKodu,.productCode,[itemprop="sku"],[data-product-code]');
    var item = { s: String(detail.stockCode || '').trim().slice(0, 80), n: String(detail.productName || '').trim().slice(0, 160) };
    if (!item.s && node) item.s = (node.getAttribute('content') || node.getAttribute('data-product-code') || node.textContent || '').replace(/^mpn:/i, '').match(/[A-Za-z0-9._*-]+/g)?.pop()?.slice(0, 80) || '';
    if (!item.n) { var title = document.querySelector('h1'); item.n = title ? title.textContent.trim().slice(0, 160) : ''; }
    if (/product|urun/i.test(pageType) && item.s) viewProduct(item);
    if (typeof window.addCartLocalStorage === 'function' && !window.addCartLocalStorage.__yb) {
      var original = window.addCartLocalStorage;
      var wrapped = function (value) {
        try {
          var before = JSON.parse(localStorage.getItem('member-cart') || '{}').cart || {};
          var after = value || {}, items = after.products || [], old = before.products || [];
          for (var i = 0; i < items.length; i++) {
            var product = items[i], code = String(product.sku || product.stockCode || product.productCode || product.id || product.productId || '');
            var qty = Number(product.quantity || product.productQuantity || product.qty || product.adet || 0), previous = 0;
            for (var j = 0; j < old.length; j++) if (String(old[j].sku || old[j].stockCode || old[j].productCode || old[j].id || old[j].productId || '') === code) previous = Number(old[j].quantity || old[j].productQuantity || old[j].qty || old[j].adet || 0);
            if (qty > previous) cartAdd(code, qty - previous, product.name || product.productName || '');
          }
        } catch (_) {}
        return original.apply(this, arguments);
      };
      wrapped.__yb = true;
      window.addCartLocalStorage = wrapped;
    }
    document.addEventListener('click', safe(function (event) {
      var button = event.target.closest && event.target.closest('.Addtobasket');
      if (button) {
        var selected = Number((document.querySelector('input[name="adet"],input.qty') || {}).value || 1);
        cartAdd(item.s, Math.max(1, selected || 1), item.n);
      }
    }), { passive: true });
    var completePage = location.pathname + ' ' + pageType;
    if (/order|siparis/i.test(completePage) && /success|complete|tamam|tesekkur|finish/i.test(completePage)) {
      var id = params.get('orderId') || params.get('siparisNo') || location.pathname;
      try { if (!localStorage.getItem('yb_order_' + id)) { localStorage.setItem('yb_order_' + id, '1'); add('order', { p: path(false), x: 1 }); } } catch (_) {}
    }
  }
  /*</TICIMAX>*/
  function init() {
    var override = window.__YB_TRACK_TEST_VID;
    try {
      vid = typeof override === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(override) ? override : localStorage.getItem('yb_vid') || '';
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(vid)) { vid = randomId(); localStorage.setItem('yb_vid', vid); }
    } catch (_) { return; }
    device = /ipad|tablet/i.test(navigator.userAgent) ? 'tablet' : /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    try { ref = document.referrer ? new URL(document.referrer).hostname.slice(0, 255) : ''; } catch (_) {}
    var now = Date.now(), previous = (sessionStorage.getItem('yb_sid') || '').split(':');
    if (!previous[0] || now - Number(previous[1]) > 1_800_000) { sid = randomId(); add('visit', { p: path(false) }); }
    else sid = previous[0];
    touch();
    __YB_TRACK_ADAPTER_INIT__;
    document.addEventListener('visibilitychange', safe(function () { if (document.visibilityState === 'hidden') flush(true); }), { passive: true });
    window.addEventListener('pagehide', safe(function () { flush(true); }), { passive: true });
  }
  function start() {
    perf = window.__YB_TRACK_TEST_PERF === true;
    if (perf) try { Object.defineProperty(window, '__YB_TRACK_METRICS', { value: { get totalMainThreadMs() { return work; } }, configurable: true }); } catch (_) {}
    safe(init)();
  }
  function idle() {
    try { if (window.requestIdleCallback) window.requestIdleCallback(safe(start), { timeout: 3000 }); else window.setTimeout(safe(start), 1500); }
    catch (_) { window.setTimeout(safe(start), 1500); }
  }
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true, passive: true });
})();
