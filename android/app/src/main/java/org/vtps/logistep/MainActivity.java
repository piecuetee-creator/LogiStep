package org.vtps.logistep;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity {
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;
    private static final String APP_HOST = "localhost";
    private WebView webView;
    private GeolocationPermissions.Callback pendingGeolocationCallback;
    private String pendingGeolocationOrigin;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(0xFF020617);
            window.setNavigationBarColor(0xFF020617);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF020617);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    WebResourceResponse resp = handleIntercept(request.getUrl());
                    if (resp != null) return resp;
                }
                return super.shouldInterceptRequest(view, request);
            }

            @SuppressWarnings("deprecation")
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url != null) {
                    WebResourceResponse resp = handleIntercept(Uri.parse(url));
                    if (resp != null) return resp;
                }
                return super.shouldInterceptRequest(view, url);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                android.util.Log.d("LogiStep", consoleMessage.message() + " [" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + "]");
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeolocationCallback = callback;
                    pendingGeolocationOrigin = origin;
                    requestLocationPermission();
                }
            }
        });

        // Check and request location permissions upfront
        if (!hasLocationPermission()) {
            requestLocationPermission();
        }

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.loadUrl("https://" + APP_HOST + "/index.html");
    }

    public class AndroidBridge {
        @android.webkit.JavascriptInterface
        public void vibrate(int ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(android.os.VibrationEffect.createOneShot(ms > 0 ? ms : 25, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(ms > 0 ? ms : 25);
                    }
                }
            } catch (Exception ignored) {}
        }

        @android.webkit.JavascriptInterface
        public void showToast(final String msg) {
            if (msg == null) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    android.widget.Toast.makeText(MainActivity.this, msg, android.widget.Toast.LENGTH_SHORT).show();
                }
            });
        }

        @android.webkit.JavascriptInterface
        public String sendTcp(final String host, final int port, final String loginHex, final String locHex, final int timeoutMs) {
            try {
                java.net.Socket socket = new java.net.Socket();
                int timeout = timeoutMs > 0 ? timeoutMs : 3000;
                socket.connect(new java.net.InetSocketAddress(host, port), timeout);
                socket.setSoTimeout(timeout);
                java.io.OutputStream out = socket.getOutputStream();
                java.io.InputStream in = socket.getInputStream();

                byte[] loginBytes = hexStringToByteArray(loginHex);
                out.write(loginBytes);
                out.flush();

                byte[] ackBuf = new byte[64];
                int ackLen = in.read(ackBuf);
                String rxHex = ackLen > 0 ? bytesToHex(ackBuf, ackLen) : "";

                byte[] locBytes = hexStringToByteArray(locHex);
                out.write(locBytes);
                out.flush();

                try { socket.close(); } catch (Exception ignored) {}
                return "{\"success\":true,\"rxHex\":\"" + rxHex + "\"}";
            } catch (Exception e) {
                return "{\"success\":false,\"error\":\"" + (e.getMessage() != null ? e.getMessage().replace("\"", "'") : "TCP socket error") + "\"}";
            }
        }
    }

    private static byte[] hexStringToByteArray(String s) {
        if (s == null) return new byte[0];
        s = s.replaceAll("[^0-9A-Fa-f]", "");
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }

    private static String bytesToHex(byte[] bytes, int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(String.format("%02X ", bytes[i]));
        }
        return sb.toString().trim();
    }

    private WebResourceResponse handleIntercept(Uri uri) {
        if (uri == null) return null;
        String host = uri.getHost();
        if (host == null || (!host.equalsIgnoreCase(APP_HOST) && !host.equalsIgnoreCase("127.0.0.1") && !host.equalsIgnoreCase("appassets.androidplatform.net"))) {
            return null;
        }

        String path = uri.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) {
            path = "index.html";
        } else if (path.startsWith("/")) {
            path = path.substring(1);
        }

        // Never let API routes fall through to index.html SPA fallback
        if (path.startsWith("api/")) {
            String jsonResp = "{\"success\":true,\"mode\":\"LIVE_ANDROID\",\"message\":\"Native Android bridge processed\"}";
            try {
                byte[] b = jsonResp.getBytes("UTF-8");
                InputStream is = new java.io.ByteArrayInputStream(b);
                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Content-Type", "application/json");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    return new WebResourceResponse("application/json", "UTF-8", 200, "OK", headers, is);
                } else {
                    return new WebResourceResponse("application/json", "UTF-8", is);
                }
            } catch (Exception ignored) {}
        }

        AssetManager assets = getAssets();
        String[] prefixes = new String[]{"public/", "www/", ""};

        for (String prefix : prefixes) {
            String fullPath = prefix + path;
            try {
                InputStream is = assets.open(fullPath);
                String mimeType = getMimeType(path);
                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Cache-Control", "no-cache");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, is);
                } else {
                    return new WebResourceResponse(mimeType, "UTF-8", is);
                }
            } catch (IOException ignored) {
            }
        }

        // SPA routing fallback (excluding api/)
        if (!path.contains(".") && !path.startsWith("api/")) {
            for (String prefix : prefixes) {
                String indexPath = prefix + "index.html";
                try {
                    InputStream is = assets.open(indexPath);
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Access-Control-Allow-Origin", "*");
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK", headers, is);
                    } else {
                        return new WebResourceResponse("text/html", "UTF-8", is);
                    }
                } catch (IOException ignored) {
                }
            }
        }

        return null;
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestLocationPermission() {
        ActivityCompat.requestPermissions(
            this,
            new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            },
            LOCATION_PERMISSION_REQUEST_CODE
        );
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingGeolocationCallback != null && pendingGeolocationOrigin != null) {
                pendingGeolocationCallback.invoke(pendingGeolocationOrigin, granted, false);
                pendingGeolocationCallback = null;
                pendingGeolocationOrigin = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                webView.evaluateJavascript("typeof window.handleAndroidBack === 'function' ? window.handleAndroidBack() : false;", new android.webkit.ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String val) {
                        if ("true".equalsIgnoreCase(val) || "\"true\"".equalsIgnoreCase(val)) {
                            return;
                        }
                        if (webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            MainActivity.super.onBackPressed();
                        }
                    }
                });
            } else if (webView.canGoBack()) {
                webView.goBack();
            } else {
                super.onBackPressed();
            }
        } else {
            super.onBackPressed();
        }
    }
}
