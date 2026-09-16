package com.boreal.client;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;
import org.json.JSONObject;

// BF_CLIENT_BACKGROUND_UPLOAD_v307
public class BackgroundUploadWorker extends Worker {
  private static final int MAX_RUNS = 20;

  public BackgroundUploadWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

  @NonNull
  @Override
  public Result doWork() {
    String id = getInputData().getString("id");
    String url = getInputData().getString("url");
    String boundary = getInputData().getString("boundary");
    String bodyPath = getInputData().getString("bodyPath");
    String headersJson = getInputData().getString("headers");
    if (id == null || url == null || boundary == null || bodyPath == null) return Result.failure();
    File body = new File(bodyPath);
    if (!body.exists()) return Result.failure();
    HttpURLConnection connection = null;
    try {
      connection = (HttpURLConnection) new URL(url).openConnection();
      connection.setRequestMethod("POST");
      connection.setDoOutput(true);
      connection.setConnectTimeout(30000);
      connection.setReadTimeout(120000);
      connection.setFixedLengthStreamingMode(body.length());
      connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
      JSONObject headers = new JSONObject(headersJson == null ? "{}" : headersJson);
      Iterator<String> keys = headers.keys();
      while (keys.hasNext()) { String key = keys.next(); connection.setRequestProperty(key, headers.getString(key)); }
      try (OutputStream out = connection.getOutputStream(); FileInputStream in = new FileInputStream(body)) {
        byte[] buffer = new byte[16384];
        int read;
        while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
      }
      int status = connection.getResponseCode();
      boolean permanent = (status >= 200 && status < 300) || status == 409
        || (status >= 400 && status < 500 && status != 401 && status != 408 && status != 429);
      if (permanent || getRunAttemptCount() >= MAX_RUNS) {
        BackgroundUploadPlugin.record(getApplicationContext(), id, status, null);
        body.delete();
        return (status >= 200 && status < 300) || status == 409 ? Result.success() : Result.failure();
      }
      return Result.retry();
    } catch (Exception error) {
      if (getRunAttemptCount() >= MAX_RUNS) {
        BackgroundUploadPlugin.record(getApplicationContext(), id, 0, String.valueOf(error.getMessage()));
        return Result.failure();
      }
      return Result.retry();
    } finally {
      if (connection != null) connection.disconnect();
    }
  }
}
