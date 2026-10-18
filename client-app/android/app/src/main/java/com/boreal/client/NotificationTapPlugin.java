package com.boreal.client;

// BF_CLIENT_v823_NOTIFICATIONS - a tapped Android notification (or one of its buttons) opens the right screen.
// BorealMessagingService builds notifications itself (data-only FCM), so Capacitor's own "tapped" event never fires
// for them; the link and button id travel as extras on MainActivity's intent and are handed to the web layer here
// (src/native/pushListener.ts routes them exactly like an iPhone tap).

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NotificationTap")
public class NotificationTapPlugin extends Plugin {
    private JSObject pending;

    @Override
    public void load() {
        capture(getActivity().getIntent(), false);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        capture(intent, true);
    }

    private synchronized void capture(Intent intent, boolean live) {
        if (intent == null || !intent.hasExtra(BorealMessagingService.EXTRA_DEEP_LINK)) return;
        JSObject tap = new JSObject();
        tap.put("url", intent.getStringExtra(BorealMessagingService.EXTRA_DEEP_LINK));
        String action = intent.getStringExtra(BorealMessagingService.EXTRA_ACTION);
        if (action != null) tap.put("actionId", action);
        String applicationId = intent.getStringExtra(BorealMessagingService.EXTRA_APPLICATION_ID);
        if (applicationId != null) tap.put("applicationId", applicationId);
        // Handled once: a rotation or a later resume must not route again.
        intent.removeExtra(BorealMessagingService.EXTRA_DEEP_LINK);
        intent.removeExtra(BorealMessagingService.EXTRA_ACTION);
        intent.removeExtra(BorealMessagingService.EXTRA_APPLICATION_ID);
        if (live && hasListeners("tap")) {
            notifyListeners("tap", tap);
        } else {
            pending = tap;
        }
    }

    /** The tap that launched the app, if any (read once at start-up). */
    @PluginMethod
    public synchronized void takePending(PluginCall call) {
        JSObject result = new JSObject();
        if (pending != null) {
            result.put("tap", pending);
            pending = null;
        }
        call.resolve(result);
    }
}
