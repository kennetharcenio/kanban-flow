import { TestBed } from '@angular/core/testing';
import { EventStoreService } from './event-store.service';
import { EventReplayService } from './event-replay.service';
import { Board } from '../../shared/models/board.model';
import { Card } from '../../shared/models/card.model';

describe('EventStoreService', () => {
  let service: EventStoreService;

  const testBoard: Board = {
    id: 'board-1', name: 'Test Board', description: '', createdBy: 'user@test.com',
    createdAt: '2026-04-03T00:00:00Z',
    columns: [{ id: 'col-1', name: 'Todo', order: 0, color: '#60a5fa' }],
    members: [{ email: 'user@test.com', name: 'Test User', avatar: '' }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventReplayService],
    });
    service = TestBed.inject(EventStoreService);
  });

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('should initialize with board state', () => {
    service.initialize(testBoard, [], []);
    const state = service.getState();
    expect(state.board.id).toBe('board-1');
    expect(state.cards.length).toBe(0);
  });

  it('should dispatch CARD_CREATED event and update state', () => {
    service.initialize(testBoard, [], []);
    const card: Card = {
      id: 'card-1', title: 'New Card', description: '', columnId: 'col-1',
      order: 0, assignee: null, dueDate: null, labels: [],
      createdBy: 'user@test.com', createdAt: '2026-04-03T00:00:00Z',
    };
    service.dispatch('CARD_CREATED', { card }, 'user@test.com');
    const state = service.getState();
    expect(state.cards.length).toBe(1);
    expect(state.cards[0].title).toBe('New Card');
  });

  it('should track pending events for sync', () => {
    service.initialize(testBoard, [], []);
    service.dispatch('COLUMN_CREATED', {
      column: { id: 'col-2', name: 'Done', order: 1, color: '#4ade80' },
    }, 'user@test.com');
    const pending = service.getPendingEvents();
    expect(pending.length).toBe(1);
    expect(pending[0].type).toBe('COLUMN_CREATED');
  });

  it('should clear pending events after acknowledgment', () => {
    service.initialize(testBoard, [], []);
    service.dispatch('COLUMN_CREATED', {
      column: { id: 'col-2', name: 'Done', order: 1, color: '#4ade80' },
    }, 'user@test.com');
    service.acknowledgePendingEvents();
    expect(service.getPendingEvents().length).toBe(0);
  });

  it('should merge remote events into state', () => {
    service.initialize(testBoard, [], []);
    service.mergeRemoteEvents([{
      id: 'evt-remote-1', type: 'CARD_CREATED', version: 1, timestamp: 1000, userId: 'other@test.com',
      payload: {
        card: {
          id: 'card-remote', title: 'Remote Card', description: '', columnId: 'col-1',
          order: 0, assignee: null, dueDate: null, labels: [],
          createdBy: 'other@test.com', createdAt: '2026-04-03T00:00:00Z',
        },
      },
    }]);
    const state = service.getState();
    expect(state.cards.length).toBe(1);
    expect(state.cards[0].title).toBe('Remote Card');
  });

  it('should expose board$ and cards$ observables', () => {
    service.initialize(testBoard, [], []);
    let cards: any;
    service.cards$.subscribe((c) => { cards = c; });
    expect(Array.isArray(cards)).toBe(true);
  });

  it('should assign incrementing version numbers to events', () => {
    service.initialize(testBoard, [], []);
    service.dispatch('COLUMN_CREATED', {
      column: { id: 'col-2', name: 'Done', order: 1, color: '#4ade80' },
    }, 'user@test.com');
    service.dispatch('COLUMN_CREATED', {
      column: { id: 'col-3', name: 'Review', order: 2, color: '#f59e0b' },
    }, 'user@test.com');
    const pending = service.getPendingEvents();
    expect(pending[0].version).toBe(1);
    expect(pending[1].version).toBe(2);
  });
});
