# Build status

Status meanings:
- **Built/tested**: implementation exists and CI covers core behavior.
- **Live-capable / config required**: provider/runtime implementation exists but requires real credentials and verification against the external service.
- **Native source shell**: native source architecture exists, but signed distributable binaries and platform-specific production integrations are not complete.
- **External environment required**: cannot truthfully be completed inside source code alone.

## Built/tested core
PWA client; secure Nikky Core API client; session/CSRF/OIDC support; System Control Center; Authority Engine; scoped policies; Approval Center; approval expiry/integrity; tamper-evident audit; workflow state machine; risk classification; idempotency/recovery; encrypted provider credential vault; OAuth refresh lifecycle; context learning; prediction confidence; feedback/adaptive proactivity; Journey/Departure orchestration; notification/escalation policy; relationships; commitments/follow-ups; task manager; context graph; life-event/travel planning; document/file/EML/config intelligence; cross-app document-to-email proposals; morning/evening briefs; onboarding; explanation/corrections; privacy/data export-delete controls; identity/session/device trust; Skill SDK/sandbox; provider health/circuit breaker; production PostgreSQL schema/repository/migrations; production worker wiring; hardened HTTP boundary; Docker deployment; end-to-end scenarios; UI static checks; security checks; native static checks; release-readiness gate; structured monitoring; liveness/readiness endpoints; graceful shutdown; PostgreSQL backup/restore tooling; operations runbook; wake-word lifecycle; optional speaker-verification policy; permission-gated active context; native capability bridge; Nikky Fabric capability graph; app/device capability permissions; universal app-controller routing; discovery aggregation; goal/capability planning; resumable missions; transaction safeguards; parking resolver; workout planning; health-signal normalization; responsiveness assessment; sensor fusion; Guardian policies/escalation; Matter/MQTT/browser automation contracts; redacted approval previews; visible Fabric permission inventory; CI and branch/PR workflow.

## Live-capable / configuration required
Google Calendar; Google Routes traffic; Open-Meteo weather; Gmail read/send; Google Drive; Spotify; Twilio SMS/calls; Slack; Microsoft 365; Notion; Home Assistant; WhatsApp Cloud API; FCM push; PostgreSQL production storage. These are not considered live until real credentials/accounts are configured and successful requests are verified.

## Native source shells
- Android Kotlin project shell with restricted manifest and foreground-service boundary.
- iOS Swift Package client/action boundary and capability model.
- Desktop Tauri/Rust source shell with restrictive CSP and local privileged-execution prohibition.

These are not signed/shippable binaries. Remaining native production work includes platform UI integration, runtime permission UX, secure OS credential storage, push registration, wake-word/speech integration where permitted, device testing, signing/notarization, and store packaging.

## External environment required
Production OAuth registrations/consent screens; cloud database/backups; production secret manager/KMS; public domain/TLS; push certificates/service accounts; provider billing/accounts; Android/iOS/desktop signing identities; production monitoring/SIEM; penetration test; legal/privacy review; app-store approvals; real-user pilot and traction metrics.

Run `npm run readiness` for a machine-readable distinction between source-level code readiness and unresolved external production prerequisites.
