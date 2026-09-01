package com.boreal.client;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureCredentials")
public class SecureCredentialsPlugin extends Plugin {
  private static final String ALIAS = "boreal.client.credentials";
  private static final String PREFS = "boreal_secure_credentials";
  private SecretKey key() throws Exception {
    KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
    if (!store.containsAlias(ALIAS)) {
      KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
      generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
      return generator.generateKey();
    }
    return ((KeyStore.SecretKeyEntry) store.getEntry(ALIAS, null)).getSecretKey();
  }
  @PluginMethod public void set(PluginCall call) {
    try {
      String value = call.getString("value"); if (value == null) { call.reject("value required"); return; }
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
      String payload = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
      getContext().getSharedPreferences(PREFS, 0).edit().putString("token", payload).apply(); call.resolve();
    } catch (Exception error) { call.reject("Secure credential write failed", error); }
  }
  @PluginMethod public void get(PluginCall call) {
    JSObject result = new JSObject();
    try {
      String payload = getContext().getSharedPreferences(PREFS, 0).getString("token", null);
      if (payload == null) { result.put("value", JSObject.NULL); call.resolve(result); return; }
      String[] parts = payload.split(":", 2); Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
      result.put("value", new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8)); call.resolve(result);
    } catch (Exception error) { call.reject("Secure credential read failed", error); }
  }
  @PluginMethod public void clear(PluginCall call) {
    getContext().getSharedPreferences(PREFS, 0).edit().remove("token").apply(); call.resolve();
  }
}
