package com.boreal.client;

// BF_CLIENT_v823_LIVE_ACTIVITY
// Android's version of the iPhone Live Activity: one quiet notification showing the application's stage, a progress
// bar (step of 7) and what to do next. The app refreshes it whenever it reads the stage (ApplicationStatusPlugin);
// BF-Server v823 sends an FCM data message ("application_status") when the stage changes while the app is closed
// (BorealMessagingService). At a final stage (funded / closed) it can be swiped away.

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public final class ApplicationStatusNotifier {
    public static final String CHANNEL = "application_status";
    public static final int NOTIFICATION_ID = 0x0B0EA2;

    private ApplicationStatusNotifier() {}

    public static void show(Context context, String applicationId, String stage, int step, int totalSteps, String action,
                            boolean isFinal) {
        ensureChannel(context);
        int total = Math.max(1, totalSteps);
        int current = Math.max(1, Math.min(step, total));
        String body = action == null || action.isEmpty() ? stage : stage + " · " + action;
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Boreal Financial · Step " + current + " of " + total)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setProgress(total, current, false)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setOngoing(!isFinal)
                .setAutoCancel(isFinal)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(openIntent(context, applicationId));
        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());
        } catch (SecurityException ignored) {
            // Notifications are switched off for Boreal; nothing to show.
        }
    }

    public static void clear(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
    }

    private static PendingIntent openIntent(Context context, String applicationId) {
        String link = applicationId == null || applicationId.isEmpty()
                ? "borealclient://home"
                : "borealclient://application/" + Uri.encode(applicationId);
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(link), context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, NOTIFICATION_ID, intent, flags);
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL) != null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Application status", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Where your application is and what to do next.");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }
}
