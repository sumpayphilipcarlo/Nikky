# Nikky operations runbook

## Health
- `GET /health/live`: process liveness. It must not depend on external providers.
- `GET /health/ready`: dependency readiness. Production should return 200 only when Nikky Core can serve workflows safely.
- `GET /v1/status`: authenticated operational detail including provider state, workflow state, audit integrity, and metrics.

## Database backup
Use `npm run backup` with `DATABASE_URL`. Backups use `pg_dump --format=custom` without shell interpolation. Store dumps in an encrypted, access-controlled backup system with a retention policy appropriate to the deployment.

## Restore
Restores are destructive. Set `NIKKY_ALLOW_RESTORE=true` and `NIKKY_RESTORE_FILE=/path/to/backup.dump`, then run `npm run restore`. Test restores in a non-production environment regularly.

## Graceful shutdown
The API stops accepting new connections before closing PostgreSQL. Workers already stop polling and close their pool on termination. Container/orchestrator termination grace periods should exceed Nikky's shutdown timeout.

## Provider outage
1. Inspect `/v1/status` and provider-health circuit breaker state.
2. Do not mark actions successful unless the provider confirms live execution.
3. Retry only through idempotent executor paths.
4. Reconnect revoked OAuth credentials through the legitimate provider flow.
5. Review audit records for partially completed workflows.

## Credential compromise
1. Revoke the affected provider credentials at the provider.
2. Rotate Nikky encryption/session/service secrets as applicable.
3. Remove/re-encrypt stored provider credentials.
4. Revoke user/device sessions when relevant.
5. Review audit logs and provider-side activity.
6. Document the incident and user impact.

## Database outage
Nikky must fail readiness rather than silently claiming normal operation. Restore connectivity or fail over according to the hosting platform, then validate migrations and `/health/ready`.

## Security incident
Preserve audit evidence, revoke affected credentials/sessions, contain provider execution, notify required stakeholders, and follow the deployment organization's incident-response/legal obligations.
