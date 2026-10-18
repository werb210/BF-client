package com.boreal.client;

// BF_CLIENT_v823_LIVE_ACTIVITY - JS side: src/native/applicationStatus.ts (same plugin name as the iPhone's).

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ApplicationStatus")
public class ApplicationStatusPlugin extends Plugin {
    @PluginMethod
    public void sync(PluginCall call) {
        String applicationId = call.getString("applicationId", "");
        if (applicationId == null || applicationId.isEmpty()) {
            call.reject("applicationId is required");
            return;
        }
        ApplicationStatusNotifier.show(getContext(), applicationId,
                call.getString("stage", "Received"),
                call.getInt("step", 1),
                call.getInt("totalSteps", 7),
                call.getString("action", ""),
                Boolean.TRUE.equals(call.getBoolean("final", false)));
        JSObject result = new JSObject();
        result.put("shown", true);
        call.resolve(result);
    }

    @PluginMethod
    public void end(PluginCall call) {
        ApplicationStatusNotifier.clear(getContext());
        call.resolve();
    }
}
