export interface AppIndex {
  boards: BoardSummary[];
  labels: Label[];
  version: number;
}

export interface BoardSummary {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface BoardSnapshot {
  board: import('./board.model').Board;
  cards: import('./card.model').Card[];
  lastEventVersion: number;
  snapshotAt: string;
  snapshotBy: string;
}
