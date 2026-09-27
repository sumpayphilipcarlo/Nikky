# Nikky threat model

## Assets
User identity, memory, calendar/email content, provider refresh/access tokens, device registrations, files, location/routine context, approval decisions, audit history and outbound action capability.

## Trust boundaries
1. User device ↔ Nikky Core
2. Nikky Core ↔ model/planner
3. Nikky Core ↔ Skill/provider adapters
4. Nikky Core ↔ storage/secret manager
5. Nikky Core ↔ push/native clients
6. Third-party providers ↔ external recipients

## Primary threats
- Prompt/tool injection attempting privileged execution
- Provider token theft or over-scoped OAuth
- Cross-user authorization failures
- Approval bypass or stale approval replay
- Duplicate outbound side effects
- Malicious or compromised Skill requesting undeclared permissions
- Sensitive memory leakage through logs, previews or analytics
- Tampering with audit records
- Device impersonation/revoked-device access
- File/document content causing unsafe downstream actions
- SSRF/arbitrary URL access from provider or file context
- Notification abuse/wake escalation spam
- Supply-chain/dependency compromise
- Account deletion/export incompleteness

## Required controls
Structured action contracts; Authority Engine; fail-closed unknown actions; expiring approvals; scoped trusted-execution rules; Skill permission sandbox; idempotency; provider circuit breakers; credential secret store; redacted previews; tamper-evident audit chain; per-user data partitioning; device/session revocation; privacy retention controls; input limits; egress allowlists in production; dependency scanning; backup/recovery; data export/delete verification.

## Residual risks
Native OS restrictions, third-party provider compromise/outage, model misinterpretation, inaccurate context/location, user-approved harmful mistakes, and platform-specific background execution limits cannot be eliminated entirely. High-impact actions should continue to require explicit user-controlled policies and conservative defaults.
