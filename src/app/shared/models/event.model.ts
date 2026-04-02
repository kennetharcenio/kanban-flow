export interface BoardEvent {
  id: string;
  type: EventType;
  payload: Record<string, any>;
  userId: string;
  timestamp: number;
  version: number;
}

export type EventType =
  | 'CARD_CREATED'
  | 'CARD_UPDATED'
  | 'CARD_MOVED'
  | 'CARD_DELETED'
  | 'COLUMN_CREATED'
  | 'COLUMN_UPDATED'
  | 'COLUMN_MOVED'
  | 'COLUMN_DELETED'
  | 'BOARD_UPDATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED';
