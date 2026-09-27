# Security architecture

Nikky uses a planner → structured action → risk/authority → approval/executor → audit lifecycle.

- The prediction/model layer must not directly invoke privileged provider APIs.
- Skills declare permissions and are invoked through the sandbox.
- Unknown actions fail closed.
- External/reputation-sensitive actions require approval unless a narrow user-defined trusted rule allows them.
- Approvals expire and show redacted action previews.
- Idempotency prevents duplicate side effects.
- Provider health/circuit breakers prevent repeated failing calls.
- Credentials belong in a secret manager or encrypted provider-connection store, never client localStorage.
- User memory supports retention limits and encryption.
- Audit chains can detect modification; production should additionally use append-only durable storage.
- Native devices are registered/trusted and can be revoked.

## Production gaps requiring environment setup
A production identity provider, managed Postgres, managed secret store, TLS/domain, provider OAuth registrations, push credentials, mobile/desktop signing, centralized logs, backups, vulnerability management and incident response procedures are deployment/environment responsibilities and are not considered live until configured and tested.
