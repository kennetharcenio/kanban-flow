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
