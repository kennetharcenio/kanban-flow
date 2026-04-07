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
