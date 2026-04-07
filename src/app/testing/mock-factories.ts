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
