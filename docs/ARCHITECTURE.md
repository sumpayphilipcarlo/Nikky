# Nikky architecture

Nikky is a proactive personal orchestration layer.

```
Signals / providers / devices
          ↓
Context graph + memory + preferences
          ↓
Prediction + proactive detectors
          ↓
Workflow planner / state machine
          ↓
Risk classifier + policy / Authority Engine
          ↓
 AUTO        APPROVAL        DENY
   ↓             ↓
Skill sandbox / executor
          ↓
Provider adapters + device routing
          ↓
Audit + metrics + feedback
```

The web/PWA, Android, iOS and desktop clients are surfaces. Nikky Core owns centralized identity, workflows, policies, memory, provider connections, jobs and audit state.

Production storage is modeled for PostgreSQL; recurring work executes through the worker layer. Provider adapters are intentionally separate from the planner so a provider cannot be called without an authorized structured action.
