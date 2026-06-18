import { Component } from '@angular/core';

import { GameCard } from '../shared/game-card.model';
import { PointsService } from '../../../core/services/points.service';

@Component({
  selector: 'app-games-home',
  standalone: false,
  templateUrl: './games-home.component.html',
  styleUrl: './games-home.component.css'
})
export class GamesHomeComponent {
  isIdentificationModalOpen = false;

  readonly games: GameCard[] = [
    {
      route: '/games/memoria-hospitalar',
      title: 'Memória Hospitalar',
      description: 'Encontre pares de termos importantes da rotina hospitalar.',
      status: 'available'
    },
    {
      route: '/games/caca-palavras-hospitalar',
      title: 'Caça-palavras Hospitalar',
      description: 'Localize palavras relacionadas ao cuidado e à segurança do paciente.',
      status: 'available'
    }
  ];

  constructor(private pointsService: PointsService) {
    this.isIdentificationModalOpen = !this.pointsService.getSavedIdentity();
  }

  onIdentificationRegistered(): void {
    this.isIdentificationModalOpen = false;
  }
}
