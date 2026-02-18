# FXRizon AI Function Alignment Audit

## Scope
This repository is an **education platform** (EduGuide) with an AI college advisor.
It does **not** implement a trading execution engine, broker adapters, or market lifecycle orchestration.

## Prompt Compliance Result
Status: **NOT ALIGNED** with the FXRizon AI trading-system specification.

Reason: The current AI implementation (`src/lib/aiEngine.ts`) is designed for college recommendation and admissions guidance, not institutional trade execution or risk governance.

## What was reviewed
- `src/lib/aiEngine.ts` — message intent detection, profile extraction, recommendation responses.
- `src/app/dashboard/page.tsx` and `src/app/demo/page.tsx` — assistant integration points.

## Key gaps vs FXRizon requirements
1. No market feed abstraction (D1/H4/H1/M15/M5).
2. No lifecycle state machine (IDLE/SCAN/COOLDOWN/ARMED/IN_POSITION/LOCKDOWN/HALTED).
3. No risk orchestrator (daily loss, max open risk, streak cooldown, kill switch).
4. No execution planner or broker adapters (MT5/OANDA market/limit/stop support).
5. No exit engine with TP1/TP2/runner, trailing, or time-stop rules.
6. No backtest/paper/live unified orchestrator core.
7. No trading ledger/audit pipeline for execution decisions.

## Mitigation implemented in this patch
A deterministic guard was added to `src/lib/aiEngine.ts` so the EduGuide assistant explicitly refuses trading-system requests and redirects users to in-scope college guidance.

This reduces misuse risk and ensures AI behavior is consistent with the app's actual domain boundaries.

## Recommendation
If FXRizon AI is required, build it as a dedicated service/repo with:
- strict event-driven core,
- deterministic lifecycle transitions,
- broker and replay adapters,
- auditable risk governance,
- and parity across live, paper, and backtest modes.
