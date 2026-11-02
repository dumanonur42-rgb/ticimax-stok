package com.yamansarulman.b2b;

import android.webkit.WebStorage;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WebDataPurge")
public class WebDataPurgePlugin extends Plugin {
    @PluginMethod
    public void purge(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WebStorage.getInstance().deleteAllData();
            WebView webView = getBridge().getWebView();
            call.resolve();
            if (webView != null) webView.post(webView::reload);
        });
    }
}
