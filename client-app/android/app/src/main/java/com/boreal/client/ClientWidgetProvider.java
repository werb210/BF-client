// BF_CLIENT_BLOCK_v591_ANDROID_WIDGET
// Home-screen widget: application stage, business name and the "What you need to do"
// count. ClientWidgetPlugin stores the snapshot when the client portal loads and asks
// every placed widget to redraw.
package com.boreal.client;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.widget.RemoteViews;
import java.util.Locale;

public class ClientWidgetProvider extends AppWidgetProvider {
  static final String PREFS = "boreal_client_widget";

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    for (int id : ids) manager.updateAppWidget(id, build(context));
  }

  static void refreshAll(Context context) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    int[] ids = manager.getAppWidgetIds(new ComponentName(context, ClientWidgetProvider.class));
    for (int id : ids) manager.updateAppWidget(id, build(context));
  }

  static String stageLabel(String raw) {
    if (raw == null || raw.trim().isEmpty()) return "Your application";
    StringBuilder out = new StringBuilder();
    for (String word : raw.trim().replace('_', ' ').split("\\s+")) {
      if (word.isEmpty()) continue;
      if (out.length() > 0) out.append(' ');
      out.append(word.substring(0, 1).toUpperCase(Locale.ROOT)).append(word.substring(1).toLowerCase(Locale.ROOT));
    }
    return out.toString();
  }

  static String todoLine(int n) {
    if (n < 0) return "Open to check";
    if (n == 0) return "Nothing to do";
    return n == 1 ? "1 thing to do" : n + " things to do";
  }

  static RemoteViews build(Context context) {
    SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String appId = p.getString("applicationId", null);
    String stage = p.getString("stage", null);
    String business = p.getString("business", null);
    int todo = p.getInt("todo", -1);

    RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.client_widget);
    if (appId == null && stage == null) {
      v.setTextViewText(R.id.client_widget_stage, "Sign in to see your application");
      v.setTextViewText(R.id.client_widget_business, "");
      v.setTextViewText(R.id.client_widget_todo, "");
    } else {
      v.setTextViewText(R.id.client_widget_stage, stageLabel(stage));
      v.setTextViewText(R.id.client_widget_business, business == null ? "" : business);
      v.setTextViewText(R.id.client_widget_todo, todoLine(todo));
      v.setTextColor(R.id.client_widget_todo, todo > 0 ? Color.parseColor("#E65100") : Color.parseColor("#2E7D32"));
    }
    String target = appId != null ? "borealclient://application/" + Uri.encode(appId) : "borealclient://home";
    Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(target));
    open.setClass(context, MainActivity.class);
    open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent pi = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    v.setOnClickPendingIntent(R.id.client_widget_root, pi);
    return v;
  }
}
