# AI Vibe Workflow

> Last updated: 2026-04-16
> Owner: DocumentationManager + project maintainer

## Goal

Provide a fast, low-friction way to build features by vibe coding while preserving:

- architecture boundaries
- production safety
- accurate, continuously updated documentation

## Maintainer Preference Profile (2026-04-16)

This workflow is tuned to the current maintainer preferences:

- Input style: give rough idea, then let AI convert it to optimized implementation
- Assumptions: avoid assumptions and ask targeted questionnaires when needed
- Prompt load: minimize number of prompts required from user
- Delivery target: production cloud plus Raspberry Pi dockerized API
- Priority risks: production reliability, docs drift, and codebase complexity
- Documentation depth: standard

## Core Agent Stack

Preferred brand-new stack (RiftFlow v1):

- RiftConductor: one-prompt orchestrator
- RiftScope: intent to scope and acceptance criteria
- RiftShip: phased implementation and validations
- RiftLedger: documentation-live synchronization
- RiftSRE: release readiness and rollback guidance

Legacy agents can still exist in the repo, but this workflow is designed to run independently of them.

## Default Build Loop

Use this loop for almost every feature, bug fix, or refactor.

1. Idea shaping (RiftScope)
- Input: rough intent, examples, constraints, "what good looks like"
- Output: scope, acceptance criteria, risks, validation checklist

2. Orchestration and execution (RiftConductor + RiftShip)
- Trigger: default path for implementation
- Output: phased code changes with validation evidence

3. Documentation sync (RiftLedger)
- Update canonical docs and changelog
- Update analysis docs when a risk is introduced, mitigated, or closed

4. Release readiness (RiftSRE)
- Run build and smoke checks
- Produce deploy notes and rollback hints

## One Prompt Superflow

If you want to send a single message and let the system orchestrate everything, use this kickoff pattern:

- "/vibe-build Add your idea here"

Fallback direct invocation pattern:

- "@RiftConductor Build this end-to-end with no assumptions. Start with a short questionnaire if needed, then execute scope, implementation, docs sync, and release checks for Vercel plus Raspberry Pi API."

Expected behavior in this mode:

- questionnaire first only when ambiguity exists
- autonomous execution through specialist delegation
- reduced back-and-forth prompts
- final handoff includes changed files, validations, risks, and docs updated

## Documentation-Live Contract

For every meaningful code change, update docs in the same working session:

- project/changelog.md: what changed and why
- analysis/*.md: risks discovered, resolved, or reclassified
- architecture/*.md: if contracts, boundaries, or runtime behavior changed
- backend/*.md and frontend/*.md: if responsibilities moved

If docs are intentionally deferred, capture a follow-up task in Documentation/PENDING_TASKS.md.

## Suggested Session Cadence

Use short delivery cycles to preserve momentum.

- 10 min: scope and constraints
- 30-90 min: implementation slice
- 15 min: review and documentation sync
- 5 min: build checks and next-step decision

Reliability-first defaults for this project:

- always run web build/type checks for frontend-impacting work
- always run API build checks for backend-impacting work
- include smoke checks for critical production endpoints when stability-sensitive code changes

## Prompt Templates

## Quick kickoff

- "@RiftScope Turn this feature vibe into an implementation spec with acceptance criteria and a risk list."

## Full delivery flow

- "/vibe-build Add your idea here"

## Documentation-only sync

- "@RiftLedger Sync docs and changelog with the latest commits and open risks."

## Release check

- "@RiftSRE Run build validation and return a go-no-go with rollback notes."

## Guardrails for Vibe Coding

- Keep architecture boundaries strict (web does not import api internals)
- Prefer small, incremental changes over broad rewrites
- Require at least one build validation before merge
- Keep user-facing behavior and docs synchronized
- If uncertain, reduce scope and ship in phases
- Ask a focused questionnaire before implementation when requirements are under-specified

## Definition of Done

A task is done only when all are true:

- code implemented and validated
- review passed or issues fixed
- docs and changelog updated
- remaining risks explicitly documented
