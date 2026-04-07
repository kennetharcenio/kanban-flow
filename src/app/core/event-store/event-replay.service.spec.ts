import { TestBed } from '@angular/core/testing';
import { EventReplayService } from './event-replay.service';
import { BoardEvent } from '../../shared/models/event.model';
import { Board } from '../../shared/models/board.model';
import { Card } from '../../shared/models/card.model';

describe('EventReplayService', () => {
  let service: EventReplayService;

  const emptyBoard: Board = {
    id: 'board-1', name: 'Test Board', description: '',
    createdBy: 'user@test.com', createdAt: '2026-04-03T00:00:00Z', columns: [], members: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventReplayService);
  });

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('should apply COLUMN_CREATED event', () => {
    const event: BoardEvent = {
      id: 'evt-1', type: 'COLUMN_CREATED', version: 1, timestamp: 1000, userId: 'user@test.com',
      payload: { column: { id: 'col-1', name: 'Backlog', order: 0, color: '#94a3b8' } },
    };
    const result = service.replay({ board: emptyBoard, cards: [] }, [event]);
    expect(result.board.columns.length).toBe(1);
    expect(result.board.columns[0].name).toBe('Backlog');
  });

  it('should apply CARD_CREATED event', () => {
    const card: Card = {
      id: 'card-1', title: 'Test Card', description: '', columnId: 'col-1',
      order: 0, assignee: null, dueDate: null, labels: [],
      createdBy: 'user@test.com', createdAt: '2026-04-03T00:00:00Z',
    };
    const event: BoardEvent = {
      id: 'evt-2', type: 'CARD_CREATED', version: 2, timestamp: 2000, userId: 'user@test.com',
      payload: { card },
    };
    const result = service.replay({ board: emptyBoard, cards: [] }, [event]);
    expect(result.cards.length).toBe(1);
    expect(result.cards[0].title).toBe('Test Card');
  });

  it('should apply CARD_MOVED event', () => {
    const existingCard: Card = {
      id: 'card-1', title: 'Test', description: '', columnId: 'col-1',
      order: 0, assignee: null, dueDate: null, labels: [],
      createdBy: 'user@test.com', createdAt: '2026-04-03T00:00:00Z',
    };
    const event: BoardEvent = {
      id: 'evt-3', type: 'CARD_MOVED', version: 3, timestamp: 3000, userId: 'user@test.com',
      payload: { cardId: 'card-1', fromColumnId: 'col-1', toColumnId: 'col-2', order: 0 },
    };
    const result = service.replay({ board: emptyBoard, cards: [existingCard] }, [event]);
    expect(result.cards[0].columnId).toBe('col-2');
    expect(result.cards[0].order).toBe(0);
  });

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
    expect(result.cards[0].columnId).toBe('col-1');
  });

  it('should apply CARD_UPDATED event', () => {
    const existingCard: Card = {
      id: 'card-1', title: 'Old Title', description: '', columnId: 'col-1',
      order: 0, assignee: null, dueDate: null, labels: [],
      createdBy: 'user@test.com', createdAt: '2026-04-03T00:00:00Z',
    };
    const event: BoardEvent = {
      id: 'evt-4', type: 'CARD_UPDATED', version: 4, timestamp: 4000, userId: 'user@test.com',
      payload: { cardId: 'card-1', changes: { title: 'New Title', assignee: 'mike@test.com' } },
    };
    const result = service.replay({ board: emptyBoard, cards: [existingCard] }, [event]);
    expect(result.cards[0].title).toBe('New Title');
    expect(result.cards[0].assignee).toBe('mike@test.com');
  });

  it('should apply CARD_DELETED event', () => {
    const existingCard: Card = {
      id: 'card-1', title: 'Delete Me', description: '', columnId: 'col-1',
      order: 0, assignee: null, dueDate: null, labels: [],
      createdBy: 'user@test.com', createdAt: '2026-04-03T00:00:00Z',
    };
    const event: BoardEvent = {
      id: 'evt-5', type: 'CARD_DELETED', version: 5, timestamp: 5000, userId: 'user@test.com',
      payload: { cardId: 'card-1' },
    };
    const result = service.replay({ board: emptyBoard, cards: [existingCard] }, [event]);
    expect(result.cards.length).toBe(0);
  });

  it('should apply COLUMN_DELETED event', () => {
    const boardWithCol: Board = {
      ...emptyBoard,
      columns: [{ id: 'col-1', name: 'Backlog', order: 0, color: '#94a3b8' }],
    };
    const event: BoardEvent = {
      id: 'evt-6', type: 'COLUMN_DELETED', version: 6, timestamp: 6000, userId: 'user@test.com',
      payload: { columnId: 'col-1' },
    };
    const result = service.replay({ board: boardWithCol, cards: [] }, [event]);
    expect(result.board.columns.length).toBe(0);
  });

  it('should replay multiple events in order', () => {
    const events: BoardEvent[] = [
      {
        id: 'evt-1', type: 'COLUMN_CREATED', version: 1, timestamp: 1000, userId: 'user@test.com',
        payload: { column: { id: 'col-1', name: 'Todo', order: 0, color: '#60a5fa' } },
      },
      {
        id: 'evt-2', type: 'CARD_CREATED', version: 2, timestamp: 2000, userId: 'user@test.com',
        payload: {
          card: {
            id: 'card-1', title: 'First Task', description: '', columnId: 'col-1',
            order: 0, assignee: null, dueDate: null, labels: [],
            createdBy: 'user@test.com', createdAt: '2026-04-03T00:00:00Z',
          },
        },
      },
      {
        id: 'evt-3', type: 'CARD_UPDATED', version: 3, timestamp: 3000, userId: 'user@test.com',
        payload: { cardId: 'card-1', changes: { title: 'Updated Task' } },
      },
    ];
    const result = service.replay({ board: emptyBoard, cards: [] }, events);
    expect(result.board.columns.length).toBe(1);
    expect(result.cards.length).toBe(1);
    expect(result.cards[0].title).toBe('Updated Task');
  });
});
