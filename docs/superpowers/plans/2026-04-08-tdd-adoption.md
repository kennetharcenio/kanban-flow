# TDD Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt TDD with enforcement — build test infrastructure, fix the CARD_MOVED bug via red-green-refactor, add pre-commit hooks and CI coverage gates.

**Architecture:** Test infrastructure lives in `src/app/testing/` with mock factories, service mocks, and replay helpers. Enforcement is two-layer: local pre-commit hook blocks commits with failing tests, GitHub Actions CI blocks merges with coverage below thresholds.

**Tech Stack:** Angular 21, Vitest 4.0.8, @vitest/coverage-v8, Angular CDK, GitHub Actions

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/testing/mock-factories.ts` | Typed factory functions for Board, Card, Column, BoardEvent |
| Create | `src/app/testing/mock-factories.spec.ts` | Tests for factory functions |
| Create | `src/app/testing/service-mocks.ts` | Pre-spied service substitutes for TestBed |
| Create | `src/app/testing/replay-helpers.ts` | Shorthand utilities for event replay assertions |
| Create | `src/app/testing/replay-helpers.spec.ts` | Tests for replay helpers |
| Modify | `src/app/core/event-store/event-replay.service.spec.ts` | Add cross-column CARD_MOVED regression test |
| Modify | `src/app/features/board/board.component.ts:158-161` | Fix: `columnId` → `toColumnId` in cross-column dispatch |
| Create | `scripts/hooks/pre-commit` | Shell script that runs tests before commit |
| Modify | `package.json` | Add `prepare` script, `@vitest/coverage-v8` devDependency |
| Modify | `angular.json` | Add coverage config to test builder |
| Create | `.github/workflows/ci.yml` | CI pipeline: test + coverage on push/PR |

---

### Task 1: Create Mock Factories

**Files:**
- Create: `src/app/testing/mock-factories.ts`
- Create: `src/app/testing/mock-factories.spec.ts`

- [ ] **Step 1: Write tests for mock factories**

Create `src/app/testing/mock-factories.spec.ts`:

```typescript
import { createMockBoard, createMockCard, createMockColumn, createMockEvent } from './mock-factories';

describe('Mock Factories', () => {
  describe('createMockBoard', () => {
    it('should return a valid Board with defaults', () => {
      const board = createMockBoard();
      expect(board.id).toBeTruthy();
      expect(board.name).toBe('Test Board');
      expect(board.columns).toEqual([]);
      expect(board.members).toEqual([]);
      expect(board.createdBy).toBe('test@kanbanflow.local');
      expect(board.createdAt).toBeTruthy();
    });

    it('should apply overrides', () => {
      const board = createMockBoard({ name: 'Custom Board', description: 'Custom' });
      expect(board.name).toBe('Custom Board');
      expect(board.description).toBe('Custom');
      expect(board.id).toBeTruthy();
    });
  });

  describe('createMockCard', () => {
    it('should return a valid Card with defaults', () => {
      const card = createMockCard();
      expect(card.id).toBeTruthy();
      expect(card.title).toBe('Test Card');
      expect(card.columnId).toBe('col-default');
      expect(card.order).toBe(0);
      expect(card.assignee).toBeNull();
      expect(card.dueDate).toBeNull();
      expect(card.labels).toEqual([]);
    });

    it('should apply overrides', () => {
      const card = createMockCard({ columnId: 'col-1', title: 'Custom', order: 3 });
      expect(card.columnId).toBe('col-1');
      expect(card.title).toBe('Custom');
      expect(card.order).toBe(3);
    });
  });

  describe('createMockColumn', () => {
    it('should return a valid Column with defaults', () => {
      const col = createMockColumn();
      expect(col.id).toBeTruthy();
      expect(col.name).toBe('Test Column');
      expect(col.order).toBe(0);
      expect(col.color).toBe('#94a3b8');
    });

    it('should apply overrides', () => {
      const col = createMockColumn({ name: 'Done', order: 2, color: '#4ade80' });
      expect(col.name).toBe('Done');
      expect(col.order).toBe(2);
      expect(col.color).toBe('#4ade80');
    });
  });

  describe('createMockEvent', () => {
    it('should return a valid BoardEvent', () => {
      const event = createMockEvent('CARD_CREATED', { card: createMockCard() });
      expect(event.id).toBeTruthy();
      expect(event.type).toBe('CARD_CREATED');
      expect(event.payload['card']).toBeTruthy();
      expect(event.userId).toBe('test@kanbanflow.local');
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.version).toBe(1);
    });

    it('should auto-increment version across calls', () => {
      const evt1 = createMockEvent('CARD_CREATED', {});
      const evt2 = createMockEvent('CARD_UPDATED', {});
      expect(evt2.version).toBe(evt1.version + 1);
    });

    it('should allow overriding version and userId', () => {
      const event = createMockEvent('CARD_MOVED', {}, { version: 99, userId: 'other@test.com' });
      expect(event.version).toBe(99);
      expect(event.userId).toBe('other@test.com');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: FAIL — `mock-factories` module not found.

- [ ] **Step 3: Implement mock factories**

Create `src/app/testing/mock-factories.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { Board, Column, Member } from '../shared/models/board.model';
import { Card } from '../shared/models/card.model';
import { BoardEvent, EventType } from '../shared/models/event.model';

let eventVersionCounter = 0;

export function resetEventVersionCounter(): void {
  eventVersionCounter = 0;
}

export function createMockBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: uuidv4(),
    name: 'Test Board',
    description: '',
    createdBy: 'test@kanbanflow.local',
    createdAt: new Date().toISOString(),
    columns: [],
    members: [],
    ...overrides,
  };
}

export function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: uuidv4(),
    title: 'Test Card',
    description: '',
    columnId: 'col-default',
    order: 0,
    assignee: null,
    dueDate: null,
    labels: [],
    createdBy: 'test@kanbanflow.local',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: uuidv4(),
    name: 'Test Column',
    order: 0,
    color: '#94a3b8',
    ...overrides,
  };
}

export function createMockEvent(
  type: EventType,
  payload: Record<string, any>,
  overrides: Partial<BoardEvent> = {}
): BoardEvent {
  eventVersionCounter++;
  return {
    id: uuidv4(),
    type,
    payload,
    userId: 'test@kanbanflow.local',
    timestamp: Date.now(),
    version: eventVersionCounter,
    ...overrides,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: All mock factory tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/testing/mock-factories.ts src/app/testing/mock-factories.spec.ts
git commit -m "feat: add mock factories for Board, Card, Column, and BoardEvent"
```

---

### Task 2: Create Replay Helpers

**Files:**
- Create: `src/app/testing/replay-helpers.ts`
- Create: `src/app/testing/replay-helpers.spec.ts`

- [ ] **Step 1: Write tests for replay helpers**

Create `src/app/testing/replay-helpers.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { EventReplayService, BoardState } from '../core/event-store/event-replay.service';
import { replayAndExpect, expectCardInColumn } from './replay-helpers';
import { createMockBoard, createMockCard, createMockColumn, createMockEvent } from './mock-factories';

describe('Replay Helpers', () => {
  let replayService: EventReplayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    replayService = TestBed.inject(EventReplayService);
  });

  describe('replayAndExpect', () => {
    it('should replay events and pass assertions to the resulting state', () => {
      const col = createMockColumn({ id: 'col-1', name: 'Todo' });
      const initialState: BoardState = {
        board: createMockBoard({ columns: [col] }),
        cards: [],
      };
      const card = createMockCard({ id: 'card-1', columnId: 'col-1' });
      const events = [createMockEvent('CARD_CREATED', { card })];

      replayAndExpect(replayService, initialState, events, (state) => {
        expect(state.cards.length).toBe(1);
        expect(state.cards[0].id).toBe('card-1');
      });
    });
  });

  describe('expectCardInColumn', () => {
    it('should pass when card is in the expected column', () => {
      const state: BoardState = {
        board: createMockBoard(),
        cards: [createMockCard({ id: 'card-1', columnId: 'col-2' })],
      };
      expectCardInColumn(state, 'card-1', 'col-2');
    });

    it('should fail when card is not in the expected column', () => {
      const state: BoardState = {
        board: createMockBoard(),
        cards: [createMockCard({ id: 'card-1', columnId: 'col-1' })],
      };
      expect(() => expectCardInColumn(state, 'card-1', 'col-2')).toThrow();
    });

    it('should fail when card does not exist', () => {
      const state: BoardState = {
        board: createMockBoard(),
        cards: [],
      };
      expect(() => expectCardInColumn(state, 'card-missing', 'col-1')).toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: FAIL — `replay-helpers` module not found.

- [ ] **Step 3: Implement replay helpers**

Create `src/app/testing/replay-helpers.ts`:

```typescript
import { EventReplayService, BoardState } from '../core/event-store/event-replay.service';
import { BoardEvent } from '../shared/models/event.model';

export function replayAndExpect(
  replayService: EventReplayService,
  initialState: BoardState,
  events: BoardEvent[],
  assertions: (state: BoardState) => void
): void {
  const result = replayService.replay(initialState, events);
  assertions(result);
}

export function expectCardInColumn(state: BoardState, cardId: string, columnId: string): void {
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) {
    throw new Error(`Card "${cardId}" not found in state. Cards: [${state.cards.map((c) => c.id).join(', ')}]`);
  }
  if (card.columnId !== columnId) {
    throw new Error(
      `Expected card "${cardId}" in column "${columnId}" but found in "${card.columnId}"`
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: All replay helper tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/testing/replay-helpers.ts src/app/testing/replay-helpers.spec.ts
git commit -m "feat: add replay test helpers (replayAndExpect, expectCardInColumn)"
```

---

### Task 3: Create Service Mocks

**Files:**
- Create: `src/app/testing/service-mocks.ts`

No spec needed — these are test utilities tested implicitly by their consumers.

- [ ] **Step 1: Create service mocks file**

Create `src/app/testing/service-mocks.ts`:

```typescript
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { signal } from '@angular/core';
import { Board } from '../shared/models/board.model';
import { Card } from '../shared/models/card.model';
import { BoardState } from '../core/event-store/event-replay.service';
import { createMockBoard } from './mock-factories';

export function createMockEventStoreService() {
  const state$ = new BehaviorSubject<BoardState>({
    board: createMockBoard(),
    cards: [],
  });

  return {
    state$,
    board$: state$.pipe(map((s) => s.board)),
    cards$: state$.pipe(map((s) => s.cards)),
    columns$: state$.pipe(map((s) => [...(s.board.columns || [])].sort((a, c) => a.order - c.order))),
    initialize: vi.fn(),
    getState: vi.fn(() => state$.getValue()),
    dispatch: vi.fn(),
    getPendingEvents: vi.fn(() => []),
    acknowledgePendingEvents: vi.fn(),
    mergeRemoteEvents: vi.fn(),
    getAllEvents: vi.fn(() => []),
    getCurrentVersion: vi.fn(() => 0),
  };
}

export function createMockSyncService() {
  return {
    isOnline: signal(true).asReadonly(),
    isSyncing: signal(false).asReadonly(),
    lastSyncTime: signal<Date | null>(null).asReadonly(),
    loadIndex: vi.fn().mockResolvedValue({ boards: [], labels: [], version: 0 }),
    saveIndex: vi.fn().mockResolvedValue(undefined),
    loadBoard: vi.fn().mockResolvedValue(undefined),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    sync: vi.fn().mockResolvedValue(undefined),
    cacheStateLocally: vi.fn(),
  };
}

export function createMockDriveService() {
  return {
    getFolderId: vi.fn(() => 'folder-123'),
    setFolderId: vi.fn(),
    clearFolderId: vi.fn(),
    buildAuthHeaders: vi.fn(() => new Headers({ Authorization: 'Bearer test-token' })),
    createFolder: vi.fn().mockResolvedValue('new-folder-id'),
    readJsonFile: vi.fn().mockResolvedValue({ data: {}, revisionId: 'rev-1' }),
    writeJsonFile: vi.fn().mockResolvedValue({ revisionId: 'rev-2' }),
    createJsonFile: vi.fn().mockResolvedValue('new-file-id'),
    findFileInFolder: vi.fn().mockResolvedValue(null),
    listFoldersInFolder: vi.fn().mockResolvedValue([]),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  };
}
```

- [ ] **Step 2: Verify the file compiles by running existing tests**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: All tests still PASS (no regressions).

- [ ] **Step 3: Commit**

```bash
git add src/app/testing/service-mocks.ts
git commit -m "feat: add pre-spied service mocks for EventStore, Sync, and Drive"
```

---

### Task 4: Fix CARD_MOVED Bug via TDD (Red)

**Files:**
- Modify: `src/app/core/event-store/event-replay.service.spec.ts`

The bug: `board.component.ts:160` dispatches cross-column moves with `{ columnId: targetColumn.id }` but `EventReplayService` reads `payload['toColumnId']`. The card's columnId becomes `undefined`.

- [ ] **Step 1: Write the failing regression test**

Add this test to the existing `describe('EventReplayService')` block in `src/app/core/event-store/event-replay.service.spec.ts`, after the existing CARD_MOVED test (line 60):

```typescript
  it('should NOT move card when payload uses columnId instead of toColumnId (regression)', () => {
    const existingCard: Card = {
      id: 'card-1', title: 'Test', description: '', columnId: 'col-1',
      order: 0, assignee: null, dueDate: null, labels: [],
      createdBy: 'user@test.com', createdAt: '2026-04-03T00:00:00Z',
    };
    const event: BoardEvent = {
      id: 'evt-bug', type: 'CARD_MOVED', version: 3, timestamp: 3000, userId: 'user@test.com',
      payload: { cardId: 'card-1', columnId: 'col-2', order: 1 },
    };
    const result = service.replay({ board: emptyBoard, cards: [existingCard] }, [event]);
    // With the bug: payload only has columnId, not toColumnId.
    // EventReplayService reads toColumnId → gets undefined → card.columnId becomes undefined.
    // After fix: board.component.ts will dispatch toColumnId, so this scenario won't occur.
    // This test documents that if only columnId is provided, the card stays in its original column.
    expect(result.cards[0].columnId).toBe('col-1');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: FAIL — `expected undefined to be 'col-1'` (because `payload['toColumnId']` is `undefined`, so `card.columnId` becomes `undefined`).

---

### Task 5: Fix CARD_MOVED Bug via TDD (Green)

**Files:**
- Modify: `src/app/core/event-store/event-replay.service.ts:33-37`
- Modify: `src/app/features/board/board.component.ts:160`

Two changes needed:
1. Make the replay service resilient — fall back to current columnId if `toColumnId` is missing.
2. Fix the board component to dispatch `toColumnId` consistently.

- [ ] **Step 1: Fix EventReplayService to handle missing toColumnId**

In `src/app/core/event-store/event-replay.service.ts`, replace the `CARD_MOVED` case (lines 33-37):

```typescript
      case 'CARD_MOVED': {
        const cards = state.cards.map((c) =>
          c.id === event.payload['cardId']
            ? { ...c, columnId: event.payload['toColumnId'] ?? c.columnId, order: event.payload['order'] }
            : c
        );
        return { ...state, cards };
      }
```

The only change is adding `?? c.columnId` so that if `toColumnId` is missing (the bug scenario), the card stays in its current column instead of becoming `undefined`.

- [ ] **Step 2: Fix BoardComponent cross-column dispatch**

In `src/app/features/board/board.component.ts`, find line 160 — the cross-column move dispatch:

Replace:
```typescript
        columnId: targetColumn.id,
```

With:
```typescript
        toColumnId: targetColumn.id,
```

This is inside the `else` branch of `dropCard()`, around lines 158-161. The other three `CARD_MOVED` dispatches in the same method (lines 143-146, 167-170, 178-181) already use `toColumnId`.

- [ ] **Step 3: Run all tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: ALL tests PASS, including the new regression test.

- [ ] **Step 4: Commit**

```bash
git add src/app/core/event-store/event-replay.service.ts src/app/core/event-store/event-replay.service.spec.ts src/app/features/board/board.component.ts
git commit -m "fix: CARD_MOVED uses columnId instead of toColumnId for cross-column moves"
```

---

### Task 6: Install Coverage Tooling

**Files:**
- Modify: `package.json`
- Modify: `angular.json`

- [ ] **Step 1: Install @vitest/coverage-v8**

Run: `npm install --save-dev @vitest/coverage-v8`

- [ ] **Step 2: Configure coverage in angular.json**

In `angular.json`, replace the test builder section (the `"test"` key under `architect`):

```json
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "coverage": true,
            "coverageReporters": ["text", "lcov"],
            "coverageThresholds": {
              "branches": 70,
              "functions": 70,
              "lines": 70,
              "statements": 70
            }
          }
        }
```

- [ ] **Step 3: Run tests with coverage to verify configuration**

Run: `npx ng test --watch=false 2>&1 | tail -40`
Expected: Tests pass. Coverage report is printed. If thresholds are not met, the command exits with non-zero.

Note: If Angular's test builder does not support `coverageThresholds` directly in `angular.json`, create a `vitest.config.ts` instead:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
});
```

Use whichever approach works with Angular 21's test builder.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json angular.json
git commit -m "chore: add vitest coverage with 70% thresholds"
```

---

### Task 7: Add Pre-commit Hook

**Files:**
- Create: `scripts/hooks/pre-commit`
- Modify: `package.json` (add `prepare` script)

- [ ] **Step 1: Create the pre-commit hook script**

Create `scripts/hooks/pre-commit`:

```bash
#!/bin/sh

echo "Running tests before commit..."
npx ng test --watch=false

if [ $? -ne 0 ]; then
  echo ""
  echo "Commit blocked: tests failed or coverage thresholds not met."
  echo "Fix the issues and try again."
  exit 1
fi
```

- [ ] **Step 2: Make the hook executable**

Run: `chmod +x scripts/hooks/pre-commit`

- [ ] **Step 3: Add prepare script to package.json**

In `package.json`, add to the `"scripts"` section:

```json
    "prepare": "git config core.hooksPath scripts/hooks"
```

The full scripts section should be:

```json
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "prepare": "git config core.hooksPath scripts/hooks"
  },
```

- [ ] **Step 4: Run prepare to activate hooks**

Run: `npm run prepare`
Expected: No output, no error. Verify with: `git config core.hooksPath` → should print `scripts/hooks`.

- [ ] **Step 5: Test the hook works by making a test commit**

Run: `git add scripts/hooks/pre-commit package.json && git commit -m "chore: add pre-commit hook that runs tests before commit"`
Expected: Tests run first, then commit succeeds if all pass.

---

### Task 8: Add GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npx ng test --watch=false
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for tests and coverage"
```

---

### Task 9: Verify Everything Works End-to-End

- [ ] **Step 1: Run the full test suite**

Run: `npx ng test --watch=false 2>&1`
Expected: All tests pass. Coverage report shows percentages. No threshold violations.

- [ ] **Step 2: Verify pre-commit hook runs on commit**

Make a trivial change (e.g., add a blank line to a file), stage it, and attempt a commit. Verify that tests run before the commit completes.

- [ ] **Step 3: Review all changes**

Run: `git log --oneline -10`
Expected commits (newest first):
1. `ci: add GitHub Actions workflow for tests and coverage`
2. `chore: add pre-commit hook that runs tests before commit`
3. `chore: add vitest coverage with 70% thresholds`
4. `fix: CARD_MOVED uses columnId instead of toColumnId for cross-column moves`
5. `feat: add pre-spied service mocks for EventStore, Sync, and Drive`
6. `feat: add replay test helpers (replayAndExpect, expectCardInColumn)`
7. `feat: add mock factories for Board, Card, Column, and BoardEvent`
