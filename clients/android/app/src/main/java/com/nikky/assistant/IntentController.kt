package com.nikky.assistant

import android.content.Context
import android.content.Intent
import android.net.Uri

class IntentController(private val context: Context) {
    fun openPackage(packageName: String): Boolean {
        val launch = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(launch)
        return true
    }

    fun openDeepLink(uri: String, packageName: String? = null): Boolean {
        val parsed = runCatching { Uri.parse(uri) }.getOrNull() ?: return false
        if (parsed.scheme !in setOf("https", "http")) return false
        val intent = Intent(Intent.ACTION_VIEW, parsed).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (!packageName.isNullOrBlank()) intent.setPackage(packageName)
        return runCatching { context.startActivity(intent); true }.getOrElse { false }
    }
}
