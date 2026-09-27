# Metrics

Nikky's north-star metric is not raw command volume. The product should reduce unnecessary commands while preserving user control.

## Product quality
- useful prediction / candidate rate
- suggestion acceptance, rejection and ignore rates
- commands/actions avoided through safe proactivity
- completed workflow rate
- provider/action reliability
- time from detection to resolved outcome
- cross-device delivery success

## Safety
- approval-required rate
- user rejection rate
- denied actions
- expired approvals
- duplicate action blocks
- executor failures
- provider circuit-breaker opens
- revoked-device/session attempts
- audit verification failures

## Learning
- correction frequency
- prediction confidence calibration
- acceptance rate by workflow type
- preference stability over time

Metrics must avoid storing unnecessary message/document contents or credentials.
