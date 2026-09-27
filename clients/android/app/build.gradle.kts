plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.nikky.assistant"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.nikky.assistant"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        val baseUrl = providers.gradleProperty("NIKKY_BASE_URL").orElse("https://app.example.invalid").get()
        buildConfigField("String", "NIKKY_BASE_URL", "\"$baseUrl\"")
    }
    buildFeatures { buildConfig = true }
}
dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.10.0")
}
