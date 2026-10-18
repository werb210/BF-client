package com.boreal.client;

// BF_CLIENT_ANDROID_PUSH_ACTIONS_v157
// Renders applicant push notifications with the action buttons the server's
// category says they should have.
//
// v144 registered notification categories on iOS, so "Upload Now" and "View
// Offer" appear there. Android had nothing equivalent: FCM was being sent a
// `notification` block, which the system renders in the tray on the app's
// behalf, and a tray-rendered notification cannot carry app-defined actions.
// BF_SERVER_FCM_DATA_ONLY_v157 switched Android to data-only messages, which
// arrive here instead, so the notification is built in app code and the
// buttons can be attached.
//
// Category ids must match BF-Server src/services/push/pushCategories.ts.

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class BorealMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_DEFAULT = "default";
    private static final String CHANNEL_CALLS = "calls";
    public static final String EXTRA_ACTION = "boreal_action";
    public static final String EXTRA_DEEP_LINK = "boreal_deep_link";
    // BF_CLIENT_v823_NOTIFICATIONS - lets a tapped "Upload Now" / "View Offer" open the right application.
    public static final String EXTRA_APPLICATION_ID = "boreal_application_id";
    private String currentApplicationId = "";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);

        Map<String, String> data = message.getData();
        if (data == null || data.isEmpty()) {
            return;
        }

        // BF_CLIENT_v823_LIVE_ACTIVITY - stage changes update the quiet status notification instead of a new alert.
        if ("application_status".equals(data.get("type"))) {
            ApplicationStatusNotifier.show(this, value(data, "applicationId", ""), value(data, "stage", "Received"),
                    intValue(data, "step", 1), intValue(data, "totalSteps", 7), value(data, "action", ""),
                    "1".equals(data.get("final")));
            return;
        }

        currentApplicationId = value(data, "applicationId", "");
        String title = value(data, "title", "Boreal Financial");
        String body = value(data, "body", "");
        String category = value(data, "categoryId", "GENERIC");
        // BF_CLIENT_v823_NOTIFICATIONS - BF-Server sends the link as "url" (deepLink kept for older messages).
        String deepLink = value(data, "url", value(data, "deepLink", "/"));
        String channelId = "MISSED_CALL".equals(category) ? CHANNEL_CALLS : CHANNEL_DEFAULT;

        ensureChannel(channelId);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(intentFor(null, deepLink));

        // Same actions the iOS categories register, so both platforms behave alike.
        if ("DOCUMENT_REQUEST".equals(category)) {
            addAction(builder, "UPLOAD_NOW", "Upload Now", deepLink);
            addAction(builder, "OPEN_APPLICATION", "Open Application", deepLink);
        } else if ("OFFER_READY".equals(category)) {
            addAction(builder, "VIEW_OFFER", "View Offer", deepLink);
            addAction(builder, "OPEN_APPLICATION", "Open Application", deepLink);
        } else if ("APPLICATION_UPDATE".equals(category)) {
            addAction(builder, "OPEN_APPLICATION", "Open Application", deepLink);
        }

        NotificationManagerCompat.from(this).notify(notificationId(data), builder.build());
    }

    private void addAction(NotificationCompat.Builder builder, String actionId, String label, String deepLink) {
        builder.addAction(0, label, intentFor(actionId, deepLink));
    }

    /**
     * Opens MainActivity carrying the action and the deep link. The web layer
     * reads these and routes exactly as it does for a tapped iOS action.
     */
    private PendingIntent intentFor(String actionId, String deepLink) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (actionId != null) {
            intent.putExtra(EXTRA_ACTION, actionId);
        }
        intent.putExtra(EXTRA_DEEP_LINK, deepLink);
        if (!currentApplicationId.isEmpty()) {
            intent.putExtra(EXTRA_APPLICATION_ID, currentApplicationId);
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        // A distinct request code per action, or Android reuses the first intent
        // for every button and every tap does the same thing.
        int requestCode = ((actionId == null ? "TAP" : actionId) + ":" + currentApplicationId + ":" + deepLink).hashCode();
        return PendingIntent.getActivity(this, requestCode, intent, flags);
    }

    private void ensureChannel(String channelId) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(channelId) != null) {
            return;
        }
        String name = CHANNEL_CALLS.equals(channelId) ? "Calls" : "Updates";
        NotificationChannel channel =
                new NotificationChannel(channelId, name, NotificationManager.IMPORTANCE_HIGH);
        manager.createNotificationChannel(channel);
    }

    /**
     * One notification per subject rather than one per message, so three
     * document requests for the same application replace each other instead of
     * stacking up.
     */
    private int notificationId(Map<String, String> data) {
        // BF_CLIENT_v823_NOTIFICATIONS - the server sends applicationId, not entityId; without it every update in a
        // category replaced the last one, even for different applications.
        String entity = value(data, "entityId", value(data, "applicationId", ""));
        String category = value(data, "categoryId", "GENERIC");
        return (category + ":" + entity).hashCode();
    }

    private static int intValue(Map<String, String> data, String key, int fallback) {
        try {
            return Integer.parseInt(value(data, key, String.valueOf(fallback)));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    // BF_CLIENT_v823_NOTIFICATIONS - this service receives Firebase messages instead of Capacitor's, so a rotated
    // token must be passed on or it only reaches the server at the next cold start.
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin.onNewToken(token);
    }

    private static String value(Map<String, String> data, String key, String fallback) {
        String found = data.get(key);
        return found == null || found.isEmpty() ? fallback : found;
    }
}
