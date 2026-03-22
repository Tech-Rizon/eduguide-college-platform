# AI Modernization Roadmap

Last updated: 2026-03-22

## Objective

Modernize EduGuide in the order that reduces operational load first, improves recommendation quality second, and adds retention features only after the core intelligence and data layers are reliable.

## Guiding Principles

- Build on the existing Supabase + Next.js backoffice and matching stack.
- Keep structured eligibility rules as the source of truth for admissions guidance.
- Use AI to triage, explain, and draft, not to invent eligibility or deadlines.
- Prefer incremental upgrades that land in production over large parallel rebuilds.

## Phase 1: Operational AI Layer

Goal: reduce manual backoffice load.

Scope:

1. Add AI triage to `support_requests`, `tutoring_requests`, and manual tickets.
2. Classify intent, urgency, risk, and recommended specialist.
3. Generate a concise internal summary and a first-draft reply.
4. Surface triage results in the backoffice queue and thread view.
5. Track triage runs for auditability and failure recovery.

Success metrics:

- 20-30% reduction in manual first-touch work
- triage packet available for most new tickets
- faster average first-response time

Implementation status:

- `Started`: 2026-03-22
- Current slice: backoffice AI triage schema, server orchestration, queue UI, and request intake wiring

## Phase 2: Profile Memory Layer

Goal: stop asking students for the same information.

Scope:

1. Store structured profile facts with confidence and source.
2. Promote confirmed facts into the active match profile.
3. Capture GPA, intended program, location, student type, budget, modality, transfer credits, and start term.
4. Add review flows for conflicting facts.

Success metrics:

- lower repeat-question rate in chat
- more complete profiles per active student

## Phase 3: Hybrid Semantic Matching

Goal: improve recommendation quality without losing hard eligibility controls.

Scope:

1. Keep the current structured program match engine.
2. Add embeddings for student profiles, programs, and colleges.
3. Blend vector similarity with eligibility, affordability, geography, and support fit.
4. Explain both positive fit reasons and blockers.

Success metrics:

- higher save-to-plan rate
- fewer zero-result or low-confidence recommendation sessions

## Phase 4: Verified Data Freshness Pipeline

Goal: keep program and admissions data trustworthy.

Scope:

1. Sync stable data from official public datasets.
2. Use Firecrawl for volatile school-level fields.
3. Track source URL and freshness per extracted field.
4. Re-scrape stale or high-value records only.

Success metrics:

- fewer stale deadlines and broken admissions links
- fewer manual corrections from staff

## Phase 5: Financial Aid Intelligence

Goal: turn aid discovery into a recurring product surface.

Scope:

1. Build a scholarship catalog and scholarship match engine.
2. Reuse saved student profile facts for scholarship fit.
3. Add fee-waiver, FAFSA, and aid deadline reminders.

Success metrics:

- more aid opportunities saved per student
- higher return rate driven by reminders

## Phase 6: AI + Human Handoff

Goal: contain simple requests with AI and hand off the rest cleanly.

Scope:

1. Add streaming AI support chat.
2. Define escalation thresholds for complexity and risk.
3. Hand off to humans with full transcript, triage, profile, and draft response context.

Success metrics:

- higher AI containment rate
- lower context-gathering time for staff

## Phase 7: Retention And Mobile

Goal: make reminders and saved momentum portable.

Scope:

1. Add deadline, checklist, scholarship, and advisor-message notifications.
2. Launch notification-capable surfaces first.
3. Reassess PWA versus React Native once reminder engagement is proven.

Success metrics:

- higher weekly retention
- higher checklist completion rate

## Current Build Order

1. AI triage and queue automation
2. verified data refresh pipeline
3. hybrid semantic matching
4. scholarship and aid matching
5. AI + human handoff
6. mobile / push surface
