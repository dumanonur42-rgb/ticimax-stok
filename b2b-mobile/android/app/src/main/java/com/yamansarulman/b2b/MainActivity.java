package com.yamansarulman.b2b;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WebDataPurgePlugin.class);
        registerPlugin(SystemInsetsPlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(
            this,
            SystemBarStyle.dark(Color.rgb(11, 42, 91)),
            SystemBarStyle.auto(Color.WHITE, Color.rgb(20, 32, 51))
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
    }

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
