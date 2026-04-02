export interface Card {
  id: string;
  title: string;
  description: string;
  columnId: string;
  order: number;
  assignee: string | null;
  dueDate: string | null;
  labels: string[];
  createdBy: string;
  createdAt: string;
}
