package com.nikky.assistant

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager

data class DiscoveredApp(
    val packageName: String,
    val label: String,
    val launchable: Boolean,
    val capabilities: List<String>
)

class AppDiscovery(private val context: Context) {
    fun launchableApps(): List<DiscoveredApp> {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        return pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            .mapNotNull { info ->
                val packageName = info.activityInfo?.packageName ?: return@mapNotNull null
                val label = info.loadLabel(pm)?.toString() ?: packageName
                DiscoveredApp(
                    packageName = packageName,
                    label = label,
                    launchable = true,
                    capabilities = listOf("app.open")
                )
            }
            .distinctBy { it.packageName }
            .sortedBy { it.label.lowercase() }
    }
}
