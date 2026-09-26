package com.boreal.client;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
@CapacitorPlugin(name = "SharedFiles")
public class SharedFilesPlugin extends Plugin {
  private final List<JSObject> pending = new ArrayList<>();
  @Override public void load() { capture(getActivity().getIntent()); }
  @Override protected void handleOnNewIntent(Intent intent) { super.handleOnNewIntent(intent); capture(intent); }
  @SuppressWarnings("deprecation")
  private synchronized void capture(Intent intent) {
    if (intent == null) return;
    String action = intent.getAction();
    List<Uri> uris = new ArrayList<>();
    if (Intent.ACTION_SEND.equals(action)) {
      Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
      if (u != null) uris.add(u);
    } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
      ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
      if (list != null) uris.addAll(list);
    } else return;
    for (Uri u : uris) { JSObject f = copy(u, intent.getType()); if (f != null) pending.add(f); }
    intent.setAction(Intent.ACTION_MAIN);
  }
  private JSObject copy(Uri uri, String type) {
    try {
      String name = "shared-file";
      try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
        if (c != null && c.moveToFirst()) { int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (i >= 0 && c.getString(i) != null) name = c.getString(i); }
      }
      name = name.replaceAll("[^A-Za-z0-9._ -]", "_");
      File dir = new File(getContext().getCacheDir(), "shared");
      if (!dir.exists() && !dir.mkdirs()) return null;
      File out = new File(dir, System.currentTimeMillis() + "-" + name);
      try (InputStream in = getContext().getContentResolver().openInputStream(uri); OutputStream os = new FileOutputStream(out)) {
        if (in == null) return null;
        byte[] buf = new byte[8192]; int n;
        while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
      }
      String mime = getContext().getContentResolver().getType(uri);
      JSObject f = new JSObject();
      f.put("path", Uri.fromFile(out).toString()); f.put("name", name);
      f.put("mimeType", mime != null ? mime : (type != null ? type : "application/octet-stream"));
      return f;
    } catch (Exception e) { return null; }
  }
  @PluginMethod public synchronized void take(PluginCall call) {
    JSArray arr = new JSArray(); for (JSObject f : pending) arr.put(f); pending.clear();
    JSObject ret = new JSObject(); ret.put("files", arr); call.resolve(ret);
  }
}
