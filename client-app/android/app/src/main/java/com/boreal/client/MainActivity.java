package com.boreal.client;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle savedInstanceState) {
    registerPlugin(SecureCredentialsPlugin.class);
    registerPlugin(BackgroundUploadPlugin.class); // BF_CLIENT_BACKGROUND_UPLOAD_v307
    registerPlugin(SharedFilesPlugin.class); // BF_CLIENT_BLOCK_v550_SHARE_TO_BOREAL
    super.onCreate(savedInstanceState);
  }
}
