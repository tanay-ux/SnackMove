package com.snackmove.app;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class AlarmActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_alarm);

        String rawTitle = getIntent().getStringExtra(AlarmReceiver.EXTRA_TITLE);
        final String title = rawTitle != null ? rawTitle : "Time to move!";

        TextView titleView = findViewById(R.id.alarm_title);
        titleView.setText(title);

        Button btnStart = findViewById(R.id.btn_start);
        btnStart.setOnClickListener(v -> {
            dismissNotification();
            Intent startIntent = new Intent(this, MainActivity.class);
            startIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startIntent.putExtra("SNACK_START", true);
            startActivity(startIntent);
            finish();
        });

        Button btnSnooze = findViewById(R.id.btn_snooze);
        btnSnooze.setOnClickListener(v -> {
            dismissNotification();
            Intent snoozeIntent = new Intent(this, SnoozeReceiver.class);
            snoozeIntent.putExtra(AlarmReceiver.EXTRA_TITLE, title);
            sendBroadcast(snoozeIntent);
            finish();
        });
    }

    private void dismissNotification() {
        NotificationManager mgr = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (mgr != null) {
            mgr.cancel(AlarmReceiver.NOTIFICATION_ID);
        }
    }
}
