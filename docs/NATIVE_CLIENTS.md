# Native client architecture

Nikky Core remains centralized. Native clients expose only OS-permitted capabilities and never bypass the Authority Engine.

## Android
A Kotlin/Android source shell now exists under `clients/android`, including an application module, restrictive manifest, runtime permission declarations, and a non-exported foreground-service boundary for future wake-word/background audio. It is **source-complete scaffolding**, not a signed APK/AAB. Production still requires runtime permission UX, notification channels, secure credential storage, push registration, testing on devices, signing, and Play Store distribution.

## iOS
A Swift Package source shell now exists under `clients/ios`, including a Nikky Core action client and explicit capability model. It is **source-complete scaffolding**, not an App Store binary. Production still requires an Xcode application target, App Intents integration, APNs, Keychain storage, entitlements, signing, device testing, and App Store review. Continuous background microphone/wake-word behavior must obey iOS platform constraints and cannot be assumed.

## Desktop
A Tauri/Rust source shell now exists under `clients/desktop/src-tauri`, with a restrictive CSP and an explicit rule that privileged provider actions are never executed locally. It is **source-complete scaffolding**, not signed Windows/macOS/Linux installers. Production still requires Tauri packaging, secure OS keychain integration, notifications, active-window permissions, microphone integration, signing/notarization, and per-OS validation.

## Release gate
`npm run readiness` checks source-level production prerequisites and separately reports external configuration blockers. Code readiness can pass while production readiness remains false when OAuth registrations, database, domain/TLS, push credentials, signing, monitoring, or other external dependencies are missing.
