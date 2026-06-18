import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { GamesHomeComponent } from './games-home/games-home.component';
import { MemoryGameComponent } from './memory-game/memory-game.component';
import { WordSearchGameComponent } from './word-search-game/word-search-game.component';
import { GamesIdentificationGuard } from './shared/games-identification.guard';

const routes: Routes = [
  {
    path: '',
    component: GamesHomeComponent
  },
  {
    path: 'memoria-hospitalar',
    component: MemoryGameComponent,
    canActivate: [GamesIdentificationGuard]
  },
  {
    path: 'caca-palavras-hospitalar',
    component: WordSearchGameComponent,
    canActivate: [GamesIdentificationGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GamesRoutingModule { }
