package com.boreal.client;

// BF_CLIENT_v823_CALENDAR - "Add to calendar" after booking a call: opens the phone's calendar app with the event
// filled in. No calendar permission is needed; the person saves it there. JS side: src/native/calendar.ts.

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.provider.CalendarContract;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CalendarEvent")
public class CalendarEventPlugin extends Plugin {
    @PluginMethod
    public void add(PluginCall call) {
        String title = call.getString("title");
        // Epoch milliseconds arrive as Long in the JSON; getDouble only accepts Double/Float/Integer.
        double start = call.getData().optDouble("startMs", Double.NaN);
        double end = call.getData().optDouble("endMs", Double.NaN);
        if (title == null || Double.isNaN(start) || Double.isNaN(end) || end <= start) {
            call.reject("title, startMs and endMs are required");
            return;
        }
        String notes = call.getString("notes", "");
        String url = call.getString("url");
        if (url != null && !url.isEmpty()) {
            notes = notes == null || notes.isEmpty() ? url : notes + "\n" + url;
        }
        Intent intent = new Intent(Intent.ACTION_INSERT)
                .setData(CalendarContract.Events.CONTENT_URI)
                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, (long) start)
                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, (long) end)
                .putExtra(CalendarContract.Events.TITLE, title)
                .putExtra(CalendarContract.Events.EVENT_LOCATION, call.getString("location", ""))
                .putExtra(CalendarContract.Events.DESCRIPTION, notes);
        JSObject result = new JSObject();
        try {
            getActivity().startActivity(intent);
            result.put("saved", true);
        } catch (ActivityNotFoundException e) {
            result.put("saved", false);
        }
        call.resolve(result);
    }
}
