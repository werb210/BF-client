package com.boreal.client;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle savedInstanceState) {
    registerPlugin(SecureCredentialsPlugin.class);
    registerPlugin(BackgroundUploadPlugin.class); // BF_CLIENT_BACKGROUND_UPLOAD_v307
    registerPlugin(SharedFilesPlugin.class); // BF_CLIENT_BLOCK_v550_SHARE_TO_BOREAL
    registerPlugin(ClientWidgetPlugin.class); // BF_CLIENT_BLOCK_v591_ANDROID_WIDGET
    registerPlugin(ApplicationStatusPlugin.class); // BF_CLIENT_v823_LIVE_ACTIVITY
    registerPlugin(CalendarEventPlugin.class); // BF_CLIENT_v823_CALENDAR
    registerPlugin(NotificationTapPlugin.class); // BF_CLIENT_v823_NOTIFICATIONS
    registerPlugin(SmsCodePlugin.class); // BF_CLIENT_v823_SMS_CODE
    super.onCreate(savedInstanceState);
    applyTextSize();
  }

  @Override public void onResume() {
    super.onResume();
    applyTextSize(); // the font size may have changed in Settings while the app was in the background
  }

  // BF_CLIENT_v823_LARGE_TEXT - the WebView ignores Android's font size by default; follow it (Settings > Display >
  // Font size), capped at 140% so screens still fit.
  static int textZoomFor(float fontScale) {
    return Math.round(Math.max(0.85f, Math.min(fontScale, 1.4f)) * 100);
  }

  private void applyTextSize() {
    if (getBridge() == null) return;
    WebView webView = getBridge().getWebView();
    if (webView == null) return;
    webView.getSettings().setTextZoom(textZoomFor(getResources().getConfiguration().fontScale));
  }
}
