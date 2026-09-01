package com.boreal.client;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle savedInstanceState) {
    registerPlugin(SecureCredentialsPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
