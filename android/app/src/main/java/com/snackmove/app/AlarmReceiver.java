package com.snackmove.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "SnackAlarm";
    public static final String CHANNEL_ID = "snack_alarm";
    public static final int NOTIFICATION_ID = 1001;
    public static final String EXTRA_TITLE = "alarm_title";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "AlarmReceiver.onReceive FIRED");

        String title = intent.getStringExtra(EXTRA_TITLE);
        if (title == null) title = "Time to move!";
        Log.i(TAG, "AlarmReceiver title: " + title);

        createNotificationChannel(context);
        postNotification(context, title);

        // Critical: schedule the next reminder natively so alarms continue even if the app isn't opened.
        ReminderScheduler.ensureNextAlarmScheduled(context, "alarm_fired");
    }

    public static void postNotification(Context context, String title) {
        Log.i(TAG, "postNotification called with title: " + title);

        Intent startIntent = new Intent(context, MainActivity.class);
        startIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startIntent.putExtra("SNACK_START", true);
        PendingIntent startPending = PendingIntent.getActivity(
                context, 100, startIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent snoozeIntent = new Intent(context, SnoozeReceiver.class);
        snoozeIntent.putExtra(EXTRA_TITLE, title);
        PendingIntent snoozePending = PendingIntent.getBroadcast(
                context, 101, snoozeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent fullScreenIntent = new Intent(context, AlarmActivity.class);
        fullScreenIntent.putExtra(EXTRA_TITLE, title);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fullScreenPending = PendingIntent.getActivity(
                context, 102, fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(title)
                .setContentText("Your snack workout is ready")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(startPending)
                .setFullScreenIntent(fullScreenPending, true)
                .addAction(0, "Start", startPending)
                .addAction(0, "Snooze", snoozePending)
                .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
                .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));

        NotificationManager mgr = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (mgr != null) {
            mgr.notify(NOTIFICATION_ID, builder.build());
            Log.i(TAG, "Notification posted successfully");
        } else {
            Log.e(TAG, "NotificationManager is null!");
        }
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager mgr = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (mgr != null && mgr.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Snack Alarms",
                        NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Snack workout reminders");
                channel.enableVibration(true);
                AudioAttributes audioAttr = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), audioAttr);
                channel.setBypassDnd(true);
                mgr.createNotificationChannel(channel);
                Log.i(TAG, "Notification channel created");
            }
        }
    }
}
