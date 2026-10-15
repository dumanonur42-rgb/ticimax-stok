package com.yamansarulman.b2b;

import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus || bridge == null) return;

        WebView webView = bridge.getWebView();
        if (webView == null || !webView.hasFocus()) return;

        webView.post(() -> webView.evaluateJavascript(
            "(function(){var e=document.activeElement;return !!e&&(e.tagName==='INPUT'||e.tagName==='TEXTAREA')&&!e.readOnly&&!e.disabled})()",
            result -> {
                if (!"true".equals(result)) return;
                webView.requestFocus();
                InputMethodManager inputMethodManager = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                if (inputMethodManager != null) {
                    inputMethodManager.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT);
                }
            }
        ));
    }
}
