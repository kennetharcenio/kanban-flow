import { Board, Column, Member } from '../shared/models/board.model';
import { Card } from '../shared/models/card.model';
import { BoardEvent, EventType } from '../shared/models/event.model';

export function createMockColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: 'col-1',
    name: 'Todo',
    order: 0,
    color: '#ffffff',
    ...overrides,
  };
}

export function createMockMember(overrides: Partial<Member> = {}): Member {
  return {
    email: 'user@test.com',
    name: 'Test User',
    avatar: '',
    ...overrides,
  };
}

export function createMockBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 'board-1',
    name: 'Test Board',
    description: 'A test board',
    createdBy: 'user@test.com',
    createdAt: new Date().toISOString(),
    columns: [createMockColumn()],
    members: [createMockMember()],
    ...overrides,
  };
}

export function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    title: 'Test Card',
    description: 'A test card',
    columnId: 'col-1',
    order: 0,
    assignee: null,
    dueDate: null,
    labels: [],
    createdBy: 'user@test.com',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockEvent(
  type: EventType,
  payload: Record<string, any> = {},
  overrides: Partial<BoardEvent> = {}
): BoardEvent {
  return {
    id: `evt-${Date.now()}`,
    type,
    payload,
    userId: 'user@test.com',
    timestamp: Date.now(),
    version: 1,
    ...overrides,
  };
}
