if (document.documentElement.getAttribute('data-legacy-webview') === 'true') {
  void import('./legacyWebView')
} else {
  void import('./main')
}
