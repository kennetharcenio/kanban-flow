import { Injectable } from '@angular/core';
import { Board } from '../../shared/models/board.model';
import { Card } from '../../shared/models/card.model';
import { BoardEvent, EventType } from '../../shared/models/event.model';

export interface BoardState {
  board: Board;
  cards: Card[];
}

@Injectable({ providedIn: 'root' })
export class EventReplayService {
  replay(initialState: BoardState, events: BoardEvent[]): BoardState {
    const sorted = [...events].sort((a, b) => a.version - b.version);
    let state = { ...initialState, board: { ...initialState.board }, cards: [...initialState.cards] };
    for (const event of sorted) {
      state = this.applyEvent(state, event);
    }
    return state;
  }

  private applyEvent(state: BoardState, event: BoardEvent): BoardState {
    switch (event.type) {
      case 'CARD_CREATED':
        return { ...state, cards: [...state.cards, event.payload['card']] };
      case 'CARD_UPDATED': {
        const cards = state.cards.map((c) =>
          c.id === event.payload['cardId'] ? { ...c, ...event.payload['changes'] } : c
        );
        return { ...state, cards };
      }
      case 'CARD_MOVED': {
        const cards = state.cards.map((c) =>
          c.id === event.payload['cardId']
            ? { ...c, columnId: event.payload['toColumnId'] ?? c.columnId, order: event.payload['order'] }
            : c
        );
        return { ...state, cards };
      }
      case 'CARD_DELETED':
        return { ...state, cards: state.cards.filter((c) => c.id !== event.payload['cardId']) };
      case 'COLUMN_CREATED':
        return { ...state, board: { ...state.board, columns: [...state.board.columns, event.payload['column']] } };
      case 'COLUMN_UPDATED': {
        const board = { ...state.board, columns: state.board.columns.map((col) =>
          col.id === event.payload['columnId'] ? { ...col, ...event.payload['changes'] } : col
        ) };
        return { ...state, board };
      }
      case 'COLUMN_MOVED': {
        const board = { ...state.board, columns: state.board.columns.map((col) =>
          col.id === event.payload['columnId'] ? { ...col, order: event.payload['order'] } : col
        ) };
        return { ...state, board };
      }
      case 'COLUMN_DELETED':
        return { ...state, board: { ...state.board, columns: state.board.columns.filter((col) => col.id !== event.payload['columnId']) } };
      case 'BOARD_UPDATED':
        return { ...state, board: { ...state.board, ...event.payload['changes'] } };
      case 'MEMBER_ADDED':
        return { ...state, board: { ...state.board, members: [...state.board.members, event.payload['member']] } };
      case 'MEMBER_REMOVED':
        return { ...state, board: { ...state.board, members: state.board.members.filter((m) => m.email !== event.payload['email']) } };
      default:
        console.warn(`Unknown event type: ${event.type}`);
        return state;
    }
  }
}
