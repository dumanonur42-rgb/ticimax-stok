package com.yamansarulman.b2b;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemInsets")
public class SystemInsetsPlugin extends Plugin {
    private static final int NAV_DARK_SURFACE = Color.rgb(20, 32, 51);
    private static final int NAV_LEGACY_SCRIM = Color.rgb(11, 42, 91);

    @Override
    public void load() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
            notifyListeners("change", toJsObject(view, insets));
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    @PluginMethod
    public void get(PluginCall call) {
        WebView webView = getBridge().getWebView();
        WindowInsetsCompat insets = webView == null ? null : ViewCompat.getRootWindowInsets(webView);
        call.resolve(toJsObject(webView, insets));
    }

    @PluginMethod
    public void setNavigationBarStyle(PluginCall call) {
        boolean dark = Boolean.TRUE.equals(call.getBoolean("dark"));
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarColor(Color.TRANSPARENT);
                window.setNavigationBarContrastEnforced(false);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                window.setNavigationBarColor(dark ? NAV_DARK_SURFACE : Color.WHITE);
            } else {
                window.setNavigationBarColor(NAV_LEGACY_SCRIM);
            }

            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightNavigationBars(!dark);
            call.resolve();
        });
    }

    private JSObject toJsObject(View webView, WindowInsetsCompat insets) {
        float density = webView == null ? 1f : webView.getResources().getDisplayMetrics().density;
        Insets bars = insets == null
            ? null
            : insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        Insets ime = insets == null ? null : insets.getInsets(WindowInsetsCompat.Type.ime());

        JSObject result = new JSObject();
        result.put("top", bars == null ? 0 : bars.top / density);
        result.put("right", bars == null ? 0 : bars.right / density);
        result.put("bottom", bars == null ? 0 : bars.bottom / density);
        result.put("left", bars == null ? 0 : bars.left / density);
        result.put("ime", ime == null ? 0 : ime.bottom / density);
        return result;
    }
}
