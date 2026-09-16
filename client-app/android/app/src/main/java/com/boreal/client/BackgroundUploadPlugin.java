package com.boreal.client;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

// BF_CLIENT_BACKGROUND_UPLOAD_v307 - WorkManager finishes uploads after the app is closed.
@CapacitorPlugin(name = "BackgroundUpload")
public class BackgroundUploadPlugin extends Plugin {
  static final String PREFS = "boreal_background_uploads";
  static final String TAG = "boreal-background-upload";

  static File directory(Context context) {
    File dir = new File(context.getFilesDir(), "background-uploads");
    if (!dir.exists()) dir.mkdirs();
    return dir;
  }

  static void record(Context context, String id, int status, String error) {
    try {
      SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      JSONObject all = new JSONObject(prefs.getString("results", "{}"));
      JSONObject entry = new JSONObject();
      entry.put("status", status);
      entry.put("error", error == null ? "" : error);
      all.put(id, entry);
      prefs.edit().putString("results", all.toString()).apply();
    } catch (Exception ignored) { }
  }

  @PluginMethod
  public void enqueue(PluginCall call) {
    String id = call.getString("id");
    String url = call.getString("url");
    String base64 = call.getString("fileBase64");
    String fileName = call.getString("fileName");
    if (id == null || url == null || base64 == null || fileName == null) { call.reject("id, url, fileBase64 and fileName are required"); return; }
    String mimeType = call.getString("mimeType", "application/octet-stream");
    JSObject fields = call.getObject("fields", new JSObject());
    JSObject headers = call.getObject("headers", new JSObject());
    try {
      String boundary = "Boundary-" + UUID.randomUUID();
      File bodyFile = new File(directory(getContext()), id + ".body");
      try (FileOutputStream out = new FileOutputStream(bodyFile)) {
        Iterator<String> keys = fields.keys();
        while (keys.hasNext()) {
          String key = keys.next();
          out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + key + "\"\r\n\r\n" + fields.getString(key) + "\r\n").getBytes(StandardCharsets.UTF_8));
        }
        String safeName = fileName.replace("\"", "");
        out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + safeName + "\"\r\nContent-Type: " + mimeType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(Base64.decode(base64, Base64.DEFAULT));
        out.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
      }
      Data input = new Data.Builder()
        .putString("id", id).putString("url", url).putString("boundary", boundary)
        .putString("bodyPath", bodyFile.getAbsolutePath()).putString("headers", headers.toString()).build();
      Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
      OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(BackgroundUploadWorker.class)
        .setInputData(input).setConstraints(constraints)
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).addTag(TAG).build();
      WorkManager.getInstance(getContext()).enqueueUniqueWork(id, ExistingWorkPolicy.KEEP, request);
      call.resolve();
    } catch (Exception error) {
      call.reject("Could not start the background upload", error);
    }
  }

  @PluginMethod
  public void results(PluginCall call) {
    JSArray list = new JSArray();
    try {
      JSONObject all = new JSONObject(getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("results", "{}"));
      Iterator<String> keys = all.keys();
      while (keys.hasNext()) {
        String key = keys.next();
        JSONObject entry = all.getJSONObject(key);
        JSObject item = new JSObject();
        item.put("id", key); item.put("status", entry.optInt("status", 0)); item.put("error", entry.optString("error", ""));
        list.put(item);
      }
    } catch (Exception ignored) { }
    JSObject result = new JSObject(); result.put("results", list); call.resolve(result);
  }

  @PluginMethod
  public void acknowledge(PluginCall call) {
    try {
      JSArray ids = call.getArray("ids", new JSArray());
      SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      JSONObject all = new JSONObject(prefs.getString("results", "{}"));
      for (int i = 0; i < ids.length(); i++) all.remove(ids.getString(i));
      prefs.edit().putString("results", all.toString()).apply();
    } catch (Exception ignored) { }
    call.resolve();
  }

  @PluginMethod
  public void cancelAll(PluginCall call) {
    WorkManager.getInstance(getContext()).cancelAllWorkByTag(TAG);
    File[] files = directory(getContext()).listFiles();
    if (files != null) for (File file : files) file.delete();
    getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove("results").apply();
    call.resolve();
  }
}
