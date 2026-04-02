export interface Board {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  columns: Column[];
  members: Member[];
}

export interface Column {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface Member {
  email: string;
  name: string;
  avatar: string;
}
