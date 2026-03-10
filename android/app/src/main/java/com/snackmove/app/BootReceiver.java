package com.snackmove.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "SnackAlarm";
    private static final String PREFS_NAME = "snack_alarm_prefs";
    private static final String KEY_NEXT_ALARM_TIME = "next_alarm_time";
    private static final String KEY_NEXT_ALARM_TITLE = "next_alarm_title";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) return;

        // On boot / time change / app update, restore the persisted next alarm and also
        // ensure we have a valid upcoming schedule based on saved settings.
        if (
                Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                Intent.ACTION_TIME_CHANGED.equals(action) ||
                Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
                Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
        ) {
            Log.i(TAG, "BootReceiver onReceive action=" + action);
        } else {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long triggerAt = prefs.getLong(KEY_NEXT_ALARM_TIME, 0);
        String title = prefs.getString(KEY_NEXT_ALARM_TITLE, "Time to move!");

        if (triggerAt <= System.currentTimeMillis()) return;

        AlarmReceiver.createNotificationChannel(context);

        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
        alarmIntent.putExtra(AlarmReceiver.EXTRA_TITLE, title);
        PendingIntent pending = PendingIntent.getBroadcast(
                context, 0, alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        AlarmManager alarmMgr = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmMgr != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmMgr.canScheduleExactAlarms()) {
                    alarmMgr.setAlarmClock(
                            new AlarmManager.AlarmClockInfo(triggerAt, pending),
                            pending);
                }
            } else {
                alarmMgr.setAlarmClock(
                        new AlarmManager.AlarmClockInfo(triggerAt, pending),
                        pending);
            }
        }

        // Extra safety: if the persisted next time is missing/expired, compute and schedule a new one.
        ReminderScheduler.ensureNextAlarmScheduled(context, "boot_or_time_change");
    }
}
