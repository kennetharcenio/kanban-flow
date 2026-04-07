# TDD Adoption Design

**Date:** 2026-04-08
**Status:** Approved
**Approach:** Forward-looking TDD workflow with enforcement (not retroactive backfill)

## Goal

Adopt test-driven development as the standard workflow for all new code in kanban-flow. Use the `columnId`/`toColumnId` bug fix as the first TDD exercise. Enforce the discipline with local pre-commit hooks and CI.

## Scope

- Test infrastructure (mock factories, service mocks, replay helpers)
- Bug fix: `CARD_MOVED` event reads `columnId` instead of `toColumnId`
- Local enforcement: pre-commit hook + Vitest coverage thresholds
- CI enforcement: GitHub Actions workflow

Out of scope: retroactive test backfill, fixing stale specs, component tests for existing code.

---

## 1. Test Infrastructure

Three files in `src/app/testing/`:

### mock-factories.ts

Factory functions that return fully-typed objects with sensible defaults and `uuid`-generated IDs. No `as any` casts.

- `createMockBoard(overrides?)` — returns a valid `Board`
- `createMockCard(overrides?)` — returns a valid `Card` with a default `columnId`
- `createMockColumn(overrides?)` — returns a valid `Column`
- `createMockEvent(type, payload, overrides?)` — returns a `BoardEvent` with auto-incrementing version

### service-mocks.ts

Functions that return pre-spied service substitutes for TestBed injection:

- `createMockEventStoreService()` — spied BehaviorSubjects for `board$`, `cards$`, `columns$`
- `createMockSyncService()` — spied signals for `isOnline`, `isSyncing`
- `createMockDriveService()` — spied methods returning resolved promises

### replay-helpers.ts

Shorthand utilities for event replay testing:

- `replayAndExpect(initialState, events, assertions)` — replays events and runs assertions on the resulting `BoardState`
- `expectCardInColumn(state, cardId, columnId)` — asserts a card exists in the expected column

---

## 2. Bug Fix: columnId/toColumnId Mismatch

**Problem:** `EventReplayService.replay()` reads `payload.columnId` when handling `CARD_MOVED` events. The `BoardComponent` dispatches these events with `payload.toColumnId`. Cards moved across columns silently remain in their original column.

**TDD sequence:**

1. **Red:** Add test to `event-replay.service.spec.ts` — create card in column A, dispatch `CARD_MOVED` with `{ cardId, toColumnId: columnB.id, newOrder: 0 }`, assert card's `columnId` is `columnB.id`. Test fails.

2. **Green:** Fix the `CARD_MOVED` handler in `EventReplayService` to read `toColumnId` instead of `columnId`. Test passes.

3. **Refactor:** Add a second test for order update within the same move. Clean up the handler for clarity.

**Files changed:**
- `src/app/core/event-store/event-replay.service.ts` (fix)
- `src/app/core/event-store/event-replay.service.spec.ts` (new tests)

---

## 3. Local Enforcement

### Pre-commit hook

A shell script at `scripts/hooks/pre-commit` that runs `ng test --watch=false`. Commits are blocked if any test fails.

Installed automatically: `package.json` has a `prepare` script that runs `git config core.hooksPath scripts/hooks`, so `npm install` sets up hooks for every developer.

```
scripts/hooks/pre-commit  (shell script, executable)
├── runs: ng test --watch=false
├── exit 0 on success (commit proceeds)
└── exit 1 on failure (commit blocked)
```

### Vitest coverage thresholds

Add `@vitest/coverage-v8` as a dev dependency. Configure coverage thresholds in the `test` builder options within `angular.json` (under `projects.kanban-flow.architect.test.options`):

- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

Coverage runs as part of `ng test`, so the pre-commit hook enforces thresholds. Thresholds start at 70% and can be ratcheted up as coverage grows.

---

## 4. GitHub Actions CI

### Workflow: `.github/workflows/ci.yml`

- **Trigger:** Push to `master`, all pull requests
- **Runner:** `ubuntu-latest`
- **Steps:**
  1. Checkout code
  2. Setup Node (match project version)
  3. `npm ci`
  4. `ng test --watch=false --code-coverage`
- **Failure:** Tests fail or coverage thresholds not met

### Branch protection (manual)

After the workflow is in place, configure in GitHub repo settings:
- Require CI check to pass before merging to `master`

---

## TDD Workflow Convention

For all future work:

1. **Red** — Write a failing test that describes the expected behavior
2. **Green** — Write the minimum code to make the test pass
3. **Refactor** — Clean up while keeping tests green
4. **Commit** — Pre-commit hook validates tests pass and coverage thresholds are met
5. **Push** — CI re-validates on the server
