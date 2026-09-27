# Build status

Status meanings:
- **Built/tested**: implementation exists and CI covers core behavior.
- **Live-capable / config required**: implementation exists but requires external OAuth/API/cloud credentials and real-provider verification.
- **Scaffold**: architecture/capability contract exists, but a platform-specific binary or external service still must be completed.
- **External environment required**: cannot truthfully be completed inside source code alone.

## Built/tested core
PWA prototype; voice/typed interface; routines; life events; local notes; Authority Engine; Approval Center; audit; orchestrator; workflow state machine; risk classification; idempotency/recovery; context learning; proactive detection; Journey/Departure orchestration; notification policy; relationships; commitments/follow-ups; task manager; context graph; prediction confidence; feedback learning; adaptive interruption; travel/life-event planning; Skill SDK/sandbox; provider health; action preview/expiry; scoped policies; tamper-evident audit; privacy controls; encrypted-memory primitive; identity/session/device trust; background worker model; product/safety metrics; file/text/EML/config intelligence; cross-app document-to-email proposal; morning/evening briefs; onboarding; explanation/corrections; data export/delete coordinator; relational schema/repository adapters; CI and branch/PR workflow.

## Live-capable / configuration required
Google Calendar read; Google Routes traffic; Open-Meteo weather (no credential required, still needs deployed client/backend); Gmail read/send; Google Drive; Spotify; Twilio SMS/calls; Slack; Microsoft 365; Notion; Home Assistant; WhatsApp Cloud API; FCM push; PostgreSQL production storage.

## Scaffold / platform work required
Android native shell/background/wake-word integration; iOS native shell/App Intents/push/background constraints; Tauri Windows/macOS/Linux clients; native speaker verification; continuous wake word; active-window/screen context; signed/notarized installers; App Store/Play Store packages.

## External environment required
Production OAuth app registrations/consent screens; cloud database and backups; production secret manager; TLS/domain; push certificates/service accounts; provider billing/accounts; mobile/desktop code signing; app-store approvals; production monitoring/SIEM; penetration test; legal/privacy review; real-user pilot and traction metrics.

The repository must not describe any item in the latter three groups as live until it has been configured and verified against the real external system.
