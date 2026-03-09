package com.snackmove.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class SnoozeReceiver extends BroadcastReceiver {

    private static final long SNOOZE_MS = 5 * 60 * 1000;

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager notifMgr = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notifMgr != null) {
            notifMgr.cancel(AlarmReceiver.NOTIFICATION_ID);
        }

        String title = intent.getStringExtra(AlarmReceiver.EXTRA_TITLE);
        if (title == null) title = "Time to move!";

        long triggerAt = System.currentTimeMillis() + SNOOZE_MS;

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
    }
}
