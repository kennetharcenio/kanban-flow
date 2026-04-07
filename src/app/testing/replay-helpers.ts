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
