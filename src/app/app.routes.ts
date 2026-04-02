import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'boards', pathMatch: 'full' },
  {
    path: 'boards',
    loadComponent: () =>
      import('./features/board-list/board-list.component').then((m) => m.BoardListComponent),
  },
  {
    path: 'boards/:id',
    loadComponent: () =>
      import('./features/board/board.component').then((m) => m.BoardComponent),
  },
  { path: '**', redirectTo: 'boards' },
];
