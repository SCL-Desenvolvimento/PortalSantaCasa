import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { GamesRoutingModule } from './games-routing.module';
import { GamesHomeComponent } from './games-home/games-home.component';
import { MemoryGameComponent } from './memory-game/memory-game.component';
import { WordSearchGameComponent } from './word-search-game/word-search-game.component';

@NgModule({
  declarations: [
    GamesHomeComponent,
    MemoryGameComponent,
    WordSearchGameComponent
  ],
  imports: [
    CommonModule,
    GamesRoutingModule
  ]
})
export class GamesModule { }
