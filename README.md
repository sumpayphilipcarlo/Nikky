# Nikky

Nikky is a proactive personal orchestration layer that predicts what users need before they ask, coordinates actions across their devices and apps, and executes them through a safety-controlled authority system.

## Current milestone

**Nikky Core v0.5**

The repository now contains a tested PWA client, centralized Nikky Core backend, workflow/authority/audit controls, persistent-worker and PostgreSQL architecture, proactive prediction and departure intelligence, relationship/commitment/task/document intelligence, provider adapters and authority-gated executors, encrypted provider credential storage, privacy controls, deployment scaffolding, native Android/iOS/Desktop source shells, and CI/security/release-readiness gates.

## Security model

The AI/prediction layer never directly invokes privileged external APIs. Nikky converts intent into a structured action, evaluates authority and scoped policies, requires approval where appropriate, executes through a registered provider executor with idempotency/recovery controls, and records the result in the audit trail.

## Production status

Many provider adapters are **live-capable**, not automatically live. Real production operation still requires legitimate OAuth/API registrations, credentials, provider accounts, PostgreSQL, TLS/domain, push infrastructure, signing identities, monitoring, and external security/legal validation.

Use:

- `npm test` — full source test/security/release gate
- `npm run readiness` — code vs external production readiness
- `npm run start:production` — production backend entrypoint
- `npm run worker` — background worker
- `npm run migrate` — database migrations

See `docs/BUILD_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/THREAT_MODEL.md`, and `docs/NATIVE_CLIENTS.md`.
