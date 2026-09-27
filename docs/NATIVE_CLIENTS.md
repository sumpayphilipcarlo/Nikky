# Native client architecture

Nikky Core remains centralized. Native clients expose only OS-permitted capabilities.

- Android: notifications, background work, optional foreground wake-word service, contacts, calls/SMS intents or provider actions, files and location.
- iOS: notifications, background refresh where permitted, App Intents/Shortcuts, contacts, files and location. Continuous wake-word/background microphone cannot be assumed.
- Desktop (Tauri target): notifications, files, optional active-window context, background process, speech and wake-word integrations where permitted.

The capability-negotiation layer chooses a device only when it explicitly advertises the required capability. Capability manifests are scaffolds, not signed/shippable native binaries.
