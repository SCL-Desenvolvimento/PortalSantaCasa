import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { GameCard } from '../shared/game-card.model';
import { PointsService } from '../../../core/services/points.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-games-home',
  standalone: false,
  templateUrl: './games-home.component.html',
  styleUrl: './games-home.component.css'
})
export class GamesHomeComponent implements OnInit {
  private readonly gameIdentityStorageKey = 'gamesCurrentIdentity';

  isIdentificationModalOpen = false;
  selectedGame?: GameCard;
  identificationForm = {
    name: '',
    re: '',
    sector: ''
  };
  departments: string[] = [];
  isLoadingDepartments = false;
  identificationError = '';

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

  constructor(
    private pointsService: PointsService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadDepartments();
  }

  openIdentificationModal(game: GameCard): void {
    if (game.status !== 'available') {
      return;
    }

    this.selectedGame = game;
    this.identificationForm = {
      name: '',
      re: '',
      sector: ''
    };
    this.identificationError = '';
    this.isIdentificationModalOpen = true;
  }

  closeIdentificationModal(): void {
    this.isIdentificationModalOpen = false;
    this.selectedGame = undefined;
    this.identificationError = '';
  }

  startSelectedGame(): void {
    const name = this.identificationForm.name.trim();
    const re = this.identificationForm.re.trim();
    const sector = this.identificationForm.sector.trim();

    if (!name || !re || !sector) {
      this.identificationError = 'Preencha Nome, RE e Setor para iniciar a partida.';
      return;
    }

    if (!this.departments.includes(sector)) {
      this.identificationError = 'Selecione um setor válido para iniciar a partida.';
      return;
    }

    if (!this.selectedGame) {
      this.identificationError = 'Selecione um jogo para continuar.';
      return;
    }

    this.pointsService.saveIdentity({ name, re, sector });
    sessionStorage.setItem(this.gameIdentityStorageKey, 'true');

    const route = this.selectedGame.route;
    this.isIdentificationModalOpen = false;
    this.selectedGame = undefined;
    this.identificationError = '';
    this.router.navigateByUrl(route);
  }

  private loadDepartments(): void {
    this.isLoadingDepartments = true;

    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
        this.isLoadingDepartments = false;
      },
      error: () => {
        this.departments = [];
        this.isLoadingDepartments = false;
        this.identificationError = 'Não foi possível carregar a lista de setores.';
      }
    });
  }
}
