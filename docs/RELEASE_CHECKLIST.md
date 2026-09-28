# Nikky release checklist

A source build is considered code-ready only when all repository tests, security scans, release-readiness checks, and PostgreSQL integration tests pass.

## Source gates
- Core unit tests
- Backend API/auth/CSRF tests
- End-to-end workflow scenarios
- UI static/accessibility/security checks
- Native shell security checks
- Operations/resilience tests
- Secret scanning across web/backend/native source
- High-severity dependency audit
- Release-readiness audit
- PostgreSQL integration/migration tests

## External production gates
These require real infrastructure or third-party approvals and cannot be completed by repository code alone:
- OAuth app registrations, consent screens, verified redirect URIs and production scopes
- Real provider credentials and successful live verification for Calendar, Gmail, Maps, Drive, Spotify, Twilio, Slack, Microsoft 365, Notion, Home Assistant, WhatsApp and FCM
- Managed PostgreSQL, encrypted backups and restore drill
- Secret manager/KMS
- Public DNS/TLS
- Push certificates/service accounts
- Android/iOS/desktop signing identities and signed builds
- App Store/Play Store review where distributed through stores
- Production monitoring/SIEM destination
- Independent penetration test
- Legal/privacy review
- Real-user pilot and measured reliability/proactivity metrics

## Truthfulness rule
A provider or native capability remains `live-capable`, `source shell`, or `external pending` until verified in the real environment. Nikky must not present those capabilities as live merely because adapter/source code exists.
