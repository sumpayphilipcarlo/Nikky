# Nikky orchestration control plane

Nikky uses a strict action lifecycle:

1. Prediction/context produces a proposed structured action.
2. The Authority Engine classifies the action as automatic, approval-required, or denied.
3. Approval-required actions are held until the user decides.
4. Only allowed actions reach an executor.
5. Every decision is written to an audit trail.

## Action contract

A proposed action must have a type and may include a payload and provenance.

Example:

    {
      "type": "email.send",
      "payload": {"recipient": "contact", "draftId": "draft-123"},
      "provenance": {"source": "calendar-follow-up"}
    }

Unknown action types fail closed to approval-required.

## Execution boundary

Provider adapters such as Gmail, Calendar, Maps, SMS, or Calls must sit behind the authority decision. A language model or prediction component must never call privileged provider adapters directly.

## Current implementation

authority.js implements policy evaluation and audit-entry creation. The next integration step is to route the existing Approval Center and command planner through this control plane before any live external provider is added.
