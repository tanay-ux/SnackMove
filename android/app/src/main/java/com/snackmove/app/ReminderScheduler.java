package com.snackmove.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Native reminder scheduler so alarms keep firing even if the app isn't opened.
 * Stores settings in SharedPreferences and always keeps a "next" AlarmManager alarm scheduled.
 */
public final class ReminderScheduler {
    private static final String TAG = "SnackAlarm";

    static final String PREFS_NAME = "snack_alarm_prefs";

    // Settings (written from JS via plugin)
    static final String KEY_SCHEDULE_ENABLED = "schedule_enabled";
    static final String KEY_START_TIME = "start_time"; // "09:00"
    static final String KEY_END_TIME = "end_time";     // "17:00"
    static final String KEY_ACTIVE_DAYS = "active_days"; // "1,2,3,4,5" (Sun=0..Sat=6)
    static final String KEY_MAX_REMINDERS = "max_reminders_per_day";
    static final String KEY_MIN_SPACING = "min_spacing_minutes";

    // Persisted next alarm (used by BootReceiver)
    static final String KEY_NEXT_ALARM_TIME = "next_alarm_time";
    static final String KEY_NEXT_ALARM_TITLE = "next_alarm_title";

    // Per-day derived params (to keep cadence stable within a day)
    private static final String KEY_DAY_SIGNATURE = "day_signature";
    private static final String KEY_DAY_INTERVAL_MIN = "day_interval_min";
    private static final String KEY_DAY_JITTER_MIN = "day_jitter_min";

    private static final int DEFAULT_MIN_INTERVAL_MINUTES = 30;
    private static final int FALLBACK_RANDOM_RANGE_MINUTES = 15;

    private static final String[] TITLES = new String[] {
            "2-minute reset?",
            "Quick energy boost?",
            "Time to move."
    };

    private ReminderScheduler() {}

    static void saveScheduleSettings(
            Context context,
            boolean enabled,
            String startTime,
            String endTime,
            String activeDaysCsv,
            int maxRemindersPerDay,
            int minSpacingMinutes
    ) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_SCHEDULE_ENABLED, enabled)
                .putString(KEY_START_TIME, startTime != null ? startTime : "09:00")
                .putString(KEY_END_TIME, endTime != null ? endTime : "17:00")
                .putString(KEY_ACTIVE_DAYS, activeDaysCsv != null ? activeDaysCsv : "1,2,3,4,5")
                .putInt(KEY_MAX_REMINDERS, Math.max(1, maxRemindersPerDay))
                .putInt(KEY_MIN_SPACING, Math.max(0, minSpacingMinutes))
                .apply();
    }

    static void cancelScheduledAlarm(Context context) {
        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(
                context, 0, alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager alarmMgr = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmMgr != null) {
            alarmMgr.cancel(pending);
        }
        pending.cancel();

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_NEXT_ALARM_TIME).remove(KEY_NEXT_ALARM_TITLE).apply();
    }

    static void ensureNextAlarmScheduled(Context context, String reason) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(KEY_SCHEDULE_ENABLED, false);
        if (!enabled) {
            Log.i(TAG, "ensureNextAlarmScheduled: disabled (" + reason + ")");
            cancelScheduledAlarm(context);
            return;
        }

        long now = System.currentTimeMillis();
        Long next = computeNextTriggerAtMs(context, now);
        if (next == null) {
            Log.w(TAG, "ensureNextAlarmScheduled: no next time found (" + reason + ")");
            return;
        }

        String title = randomTitle();
        scheduleExactAlarm(context, next, title, reason);
    }

    private static void scheduleExactAlarm(Context context, long triggerAtMs, String title, String reason) {
        Log.i(TAG, "Scheduling next alarm at " + new Date(triggerAtMs) + " title=" + title + " reason=" + reason);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putLong(KEY_NEXT_ALARM_TIME, triggerAtMs)
                .putString(KEY_NEXT_ALARM_TITLE, title)
                .apply();

        AlarmReceiver.createNotificationChannel(context);

        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
        alarmIntent.putExtra(AlarmReceiver.EXTRA_TITLE, title);

        PendingIntent pending = PendingIntent.getBroadcast(
                context, 0, alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmMgr = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmMgr == null) {
            Log.e(TAG, "AlarmManager is null; cannot schedule");
            return;
        }

        // Most reliable path first.
        try {
            alarmMgr.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAtMs, pending), pending);
            Log.i(TAG, "Alarm scheduled via setAlarmClock");
            return;
        } catch (SecurityException e) {
            Log.w(TAG, "setAlarmClock failed: " + e.getMessage());
        }

        try {
            alarmMgr.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pending);
            Log.i(TAG, "Alarm scheduled via setExactAndAllowWhileIdle");
            return;
        } catch (SecurityException e) {
            Log.w(TAG, "setExactAndAllowWhileIdle failed: " + e.getMessage());
        }

        alarmMgr.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pending);
        Log.i(TAG, "Alarm scheduled via setAndAllowWhileIdle (inexact)");
    }

    private static Long computeNextTriggerAtMs(Context context, long nowMs) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String startTime = prefs.getString(KEY_START_TIME, "09:00");
        String endTime = prefs.getString(KEY_END_TIME, "17:00");
        String activeDaysCsv = prefs.getString(KEY_ACTIVE_DAYS, "1,2,3,4,5");
        int maxReminders = Math.max(1, prefs.getInt(KEY_MAX_REMINDERS, 6));
        int minSpacing = Math.max(0, prefs.getInt(KEY_MIN_SPACING, 60));

        int startMins = parseTimeToMinutes(startTime);
        int endMins = parseTimeToMinutes(endTime);
        int windowMinutes = Math.max(0, endMins - startMins);
        if (windowMinutes <= 0) return null;

        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(nowMs);

        for (int dayOffset = 0; dayOffset <= 7; dayOffset++) {
            Calendar day = (Calendar) cal.clone();
            if (dayOffset > 0) day.add(Calendar.DAY_OF_YEAR, dayOffset);

            int jsDow = calendarToJsDayOfWeek(day);
            if (!isActiveDay(activeDaysCsv, jsDow)) continue;

            long dayStartMs = startOfDayMs(day) + (long) startMins * 60_000L;
            long dayEndMs = startOfDayMs(day) + (long) endMins * 60_000L;

            if (dayOffset == 0 && nowMs > dayEndMs) continue;

            DayParams params = getOrCreateDayParams(prefs, day, windowMinutes, maxReminders, minSpacing);
            long firstMs = dayStartMs + (long) params.jitterMinutes * 60_000L;

            for (int n = 0; n < maxReminders; n++) {
                long t = firstMs + (long) n * params.intervalMinutes * 60_000L;
                if (t < dayStartMs) continue;
                if (t > dayEndMs) break;
                if (t <= nowMs + 1000L) continue;
                return t;
            }
        }

        return null;
    }

    private static DayParams getOrCreateDayParams(
            SharedPreferences prefs,
            Calendar day,
            int windowMinutes,
            int maxReminders,
            int minSpacingMinutes
    ) {
        String dayKey = formatDayKey(day.getTimeInMillis());
        String signature = dayKey + ":" + windowMinutes + ":" + maxReminders + ":" + minSpacingMinutes;

        String existingSig = prefs.getString(KEY_DAY_SIGNATURE, null);
        int existingInterval = prefs.getInt(KEY_DAY_INTERVAL_MIN, -1);
        int existingJitter = prefs.getInt(KEY_DAY_JITTER_MIN, -1);

        if (signature.equals(existingSig) && existingInterval > 0 && existingJitter >= 0) {
            return new DayParams(existingInterval, existingJitter);
        }

        int baseInterval = (int) Math.floor((double) windowMinutes / (double) Math.max(1, maxReminders));
        int minFloor = Math.max(DEFAULT_MIN_INTERVAL_MINUTES, minSpacingMinutes);

        SecureRandom rng = new SecureRandom();
        int interval = baseInterval;
        if (interval < minFloor) {
            interval = minFloor + rng.nextInt(FALLBACK_RANDOM_RANGE_MINUTES + 1);
        }
        int jitter = interval > 1 ? rng.nextInt(interval) : 0;

        prefs.edit()
                .putString(KEY_DAY_SIGNATURE, signature)
                .putInt(KEY_DAY_INTERVAL_MIN, interval)
                .putInt(KEY_DAY_JITTER_MIN, jitter)
                .apply();

        return new DayParams(interval, jitter);
    }

    private static int parseTimeToMinutes(String hhmm) {
        if (hhmm == null) return 0;
        try {
            String[] parts = hhmm.split(":");
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            return h * 60 + m;
        } catch (Exception e) {
            return 0;
        }
    }

    // JS uses Sun=0..Sat=6. Calendar uses Sun=1..Sat=7.
    private static int calendarToJsDayOfWeek(Calendar c) {
        int calDow = c.get(Calendar.DAY_OF_WEEK); // 1..7
        return calDow == Calendar.SUNDAY ? 0 : (calDow - 1);
    }

    private static boolean isActiveDay(String csv, int jsDow) {
        if (csv == null || csv.isEmpty()) return false;
        String needle = String.valueOf(jsDow);
        String[] parts = csv.split(",");
        for (String p : parts) {
            if (needle.equals(p.trim())) return true;
        }
        return false;
    }

    private static long startOfDayMs(Calendar c) {
        Calendar d = (Calendar) c.clone();
        d.set(Calendar.HOUR_OF_DAY, 0);
        d.set(Calendar.MINUTE, 0);
        d.set(Calendar.SECOND, 0);
        d.set(Calendar.MILLISECOND, 0);
        return d.getTimeInMillis();
    }

    private static String formatDayKey(long ts) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return sdf.format(new Date(ts));
    }

    private static String randomTitle() {
        SecureRandom rng = new SecureRandom();
        return TITLES[rng.nextInt(TITLES.length)];
    }

    private static final class DayParams {
        final int intervalMinutes;
        final int jitterMinutes;
        DayParams(int intervalMinutes, int jitterMinutes) {
            this.intervalMinutes = Math.max(1, intervalMinutes);
            this.jitterMinutes = Math.max(0, jitterMinutes);
        }
    }
}

