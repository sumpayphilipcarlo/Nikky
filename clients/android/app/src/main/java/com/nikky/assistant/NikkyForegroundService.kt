package com.nikky.assistant

import android.app.Service
import android.content.Intent
import android.os.IBinder

class NikkyForegroundService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Wake-word/background audio requires explicit runtime permission and a visible
        // foreground notification. This service never performs privileged external actions.
        return START_STICKY
    }
}
