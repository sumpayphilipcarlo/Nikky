package com.nikky.assistant

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.os.IBinder

class WakeWordService : Service() {
    override fun onCreate() {
        super.onCreate()
        val notification = Notification.Builder(this, "nikky")
            .setContentTitle("Nikky voice service")
            .setContentText("Listening is enabled only while this foreground service is active.")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .build()
        startForeground(42, notification)
        // Wake-word engine integration belongs here. It must run locally and require explicit microphone permission.
    }
    override fun onBind(intent: Intent?): IBinder? = null
}
