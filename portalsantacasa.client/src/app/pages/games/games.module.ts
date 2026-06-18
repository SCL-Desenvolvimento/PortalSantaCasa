import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { GamesRoutingModule } from './games-routing.module';
import { GamesHomeComponent } from './games-home/games-home.component';
import { MemoryGameComponent } from './memory-game/memory-game.component';
import { WordSearchGameComponent } from './word-search-game/word-search-game.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    GamesHomeComponent,
    MemoryGameComponent,
    WordSearchGameComponent
  ],
  imports: [
    CommonModule,
    GamesRoutingModule,
    SharedModule
  ]
})
export class GamesModule { }
