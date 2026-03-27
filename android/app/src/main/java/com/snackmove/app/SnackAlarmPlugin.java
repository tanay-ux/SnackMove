package com.snackmove.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SnackAlarm",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { "android.permission.POST_NOTIFICATIONS" }
        )
    }
)
public class SnackAlarmPlugin extends Plugin {

    private static final String TAG = "SnackAlarm";
    private static final String PREFS_NAME = "snack_alarm_prefs";
    private static final String KEY_NEXT_ALARM_TIME = "next_alarm_time";
    private static final String KEY_NEXT_ALARM_TITLE = "next_alarm_title";

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        Log.i(TAG, "requestPermissions called");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Requesting POST_NOTIFICATIONS permission");
                requestPermissionForAlias("notifications", call, "notificationPermCallback");
                return;
            } else {
                Log.i(TAG, "POST_NOTIFICATIONS already granted");
            }
        }

        checkExactAlarmPermission();

        JSObject result = new JSObject();
        result.put("notifications", "granted");
        call.resolve(result);
    }

    @PluginMethod
    public void checkNotificationPermissionStatus(PluginCall call) {
        String status = "granted";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
            status = granted ? "granted" : "denied";
        }
        JSObject result = new JSObject();
        result.put("notifications", status);
        call.resolve(result);
    }

    @PermissionCallback
    private void notificationPermCallback(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }
        Log.i(TAG, "notificationPermCallback: granted=" + granted);

        checkExactAlarmPermission();

        JSObject result = new JSObject();
        result.put("notifications", granted ? "granted" : "denied");
        call.resolve(result);
    }

    private void checkExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmMgr = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmMgr != null) {
                boolean canSchedule = alarmMgr.canScheduleExactAlarms();
                Log.i(TAG, "canScheduleExactAlarms: " + canSchedule);
                if (!canSchedule) {
                    Log.i(TAG, "Opening SCHEDULE_EXACT_ALARM settings");
                    try {
                        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(intent);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to open exact alarm settings: " + e.getMessage());
                    }
                }
            }
        }
    }

    @PluginMethod
    public void syncSettings(PluginCall call) {
        Context context = getContext();
        boolean enabled = call.getBoolean("enabled", true);
        String startTime = call.getString("startTime", "09:00");
        String endTime = call.getString("endTime", "17:00");
        String activeDays = call.getString("activeDays", "1,2,3,4,5");
        int frequencyMinutes = call.getInt("reminderFrequencyMinutes", 30);
        boolean vibrateOnly = call.getBoolean("vibrateOnly", false);

        Log.i(TAG, "syncSettings: enabled=" + enabled + " startTime=" + startTime
                + " endTime=" + endTime + " activeDays=" + activeDays
                + " frequencyMinutes=" + frequencyMinutes + " vibrateOnly=" + vibrateOnly);

        ReminderScheduler.saveScheduleSettings(
                context, enabled, startTime, endTime, activeDays, frequencyMinutes, vibrateOnly);

        ReminderScheduler.ensureNextAlarmScheduled(context, "syncSettings");

        call.resolve(new JSObject().put("synced", true));
    }

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        String title = call.getString("title", "Time to move!");

        long triggerAt = -1;
        try {
            triggerAt = call.getData().getLong("time");
        } catch (Exception e) {
            Log.e(TAG, "scheduleAlarm: failed to parse time: " + e.getMessage());
        }

        if (triggerAt <= 0) {
            Log.e(TAG, "scheduleAlarm: Missing or invalid time parameter, raw data: " + call.getData().toString());
            call.reject("Missing required parameter: time");
            return;
        }
        long nowMs = System.currentTimeMillis();
        long delaySec = (triggerAt - nowMs) / 1000;
        Context context = getContext();

        Log.i(TAG, "scheduleAlarm: triggerAt=" + triggerAt + " now=" + nowMs + " delaySec=" + delaySec + " title=" + title);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(ReminderScheduler.KEY_SCHEDULE_ENABLED, true)
                .putLong(KEY_NEXT_ALARM_TIME, triggerAt)
                .putString(KEY_NEXT_ALARM_TITLE, title)
                .apply();

        AlarmReceiver.createNotificationChannels(context);

        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
        alarmIntent.putExtra(AlarmReceiver.EXTRA_TITLE, title);
        PendingIntent pending = PendingIntent.getBroadcast(
                context, 0, alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        AlarmManager alarmMgr = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmMgr == null) {
            Log.e(TAG, "AlarmManager is null");
            call.reject("AlarmManager not available");
            return;
        }

        // Try setAlarmClock first (most reliable, shows alarm icon)
        try {
            alarmMgr.setAlarmClock(
                    new AlarmManager.AlarmClockInfo(triggerAt, pending),
                    pending);
            Log.i(TAG, "SUCCESS: Alarm scheduled via setAlarmClock");
            call.resolve(new JSObject().put("scheduled", true));
            return;
        } catch (SecurityException e) {
            Log.w(TAG, "setAlarmClock failed: " + e.getMessage());
        }

        // Try setExactAndAllowWhileIdle
        try {
            alarmMgr.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            Log.i(TAG, "SUCCESS: Alarm scheduled via setExactAndAllowWhileIdle");
            call.resolve(new JSObject().put("scheduled", true));
            return;
        } catch (SecurityException e) {
            Log.w(TAG, "setExactAndAllowWhileIdle failed: " + e.getMessage());
        }

        // Last resort: inexact alarm
        alarmMgr.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
        Log.i(TAG, "SUCCESS: Alarm scheduled via setAndAllowWhileIdle (inexact)");
        call.resolve(new JSObject().put("scheduled", true));
    }

    @PluginMethod
    public void testNotification(PluginCall call) {
        Log.i(TAG, "testNotification: firing notification directly (bypassing AlarmManager)");
        String title = call.getString("title", "Test reminder!");
        Context context = getContext();
        AlarmReceiver.createNotificationChannels(context);
        boolean vibrateOnly = AlarmReceiver.isVibrateOnlyEnabled(context);
        AlarmReceiver.postNotification(context, title, vibrateOnly);
        Log.i(TAG, "testNotification: done");
        call.resolve(new JSObject().put("fired", true));
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        Context context = getContext();

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_NEXT_ALARM_TIME).remove(KEY_NEXT_ALARM_TITLE).apply();

        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(
                context, 0, alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        AlarmManager alarmMgr = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmMgr != null) {
            alarmMgr.cancel(pending);
        }
        pending.cancel();

        Log.i(TAG, "Alarm cancelled");
        call.resolve(new JSObject().put("cancelled", true));
    }

    @PluginMethod
    public void checkLaunchIntent(PluginCall call) {
        Intent intent = getActivity().getIntent();
        boolean snackStart = intent.getBooleanExtra("SNACK_START", false);
        Log.i(TAG, "checkLaunchIntent: snackStart=" + snackStart);
        JSObject result = new JSObject();
        result.put("snackStart", snackStart);
        if (snackStart) {
            intent.removeExtra("SNACK_START");
        }
        call.resolve(result);
    }
}
