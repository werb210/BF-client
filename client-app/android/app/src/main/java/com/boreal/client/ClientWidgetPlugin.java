// BF_CLIENT_BLOCK_v591_ANDROID_WIDGET - same "ClientWidget" plugin the iOS app has (v590).
package com.boreal.client;

import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ClientWidget")
public class ClientWidgetPlugin extends Plugin {
  @PluginMethod
  public void update(PluginCall call) {
    SharedPreferences p = getContext().getSharedPreferences(ClientWidgetProvider.PREFS, android.content.Context.MODE_PRIVATE);
    SharedPreferences.Editor e = p.edit();
    String id = call.getString("applicationId");
    // A different application replaces the old snapshot instead of mixing the two.
    String old = p.getString("applicationId", null);
    if (id != null && old != null && !old.equals(id)) e.clear();
    if (id != null) e.putString("applicationId", id);
    String stage = call.getString("stage");
    if (stage != null) e.putString("stage", stage);
    String business = call.getString("business");
    if (business != null) e.putString("business", business);
    Integer todo = call.getInt("todo");
    if (todo != null) e.putInt("todo", Math.max(0, todo));
    e.apply();
    ClientWidgetProvider.refreshAll(getContext());
    call.resolve();
  }

  @PluginMethod
  public void clear(PluginCall call) {
    getContext().getSharedPreferences(ClientWidgetProvider.PREFS, android.content.Context.MODE_PRIVATE).edit().clear().apply();
    ClientWidgetProvider.refreshAll(getContext());
    call.resolve();
  }
}
