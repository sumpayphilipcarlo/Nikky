# Nikky Core backend

The backend moves privileged orchestration, memory, scheduling, metrics, and approvals out of the browser.

## Current endpoints

- `GET /health`
- `GET /v1/approvals`
- `GET /v1/audit`
- `GET /v1/metrics`
- `GET /v1/workflows`
- `GET|POST /v1/memory`
- `DELETE /v1/memory/:id`
- `POST /v1/actions/propose`
- `POST /v1/approvals/:id/approve`
- `POST /v1/approvals/:id/reject`
- `POST /v1/jobs/tick`

All `/v1` routes require the service bearer token in the current implementation.

## Required environment variables

- `NIKKY_SERVICE_TOKEN`
- `NIKKY_MEMORY_KEY`
- `PORT` (optional)

The current runtime uses in-memory repositories. Production database, refresh-token storage, distributed jobs, user authentication, and provider executors remain separate follow-on layers.
