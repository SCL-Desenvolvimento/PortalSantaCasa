import { Component, OnDestroy, OnInit } from '@angular/core';
import { PointsService } from '../../../core/services/points.service';

interface MemoryCard {
  id: number;
  pairId: number;
  term: string;
  description: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type DifficultyKey = 'easy' | 'medium' | 'hard';

interface MemoryTerm {
  term: string;
  description: string;
}

interface DifficultyConfig {
  key: DifficultyKey;
  label: string;
  pairs: number;
  pointsPerPair: number;
  completionBonus: number;
  fastTimeLimit: number;
  fastTimeBonus: number;
  errorPenalty: number;
  terms: MemoryTerm[];
}

interface MemoryGameResult {
  score: number;
  difficulty: DifficultyKey;
  timeInSeconds: number;
  matchedPairs: number;
  totalPairs: number;
  moves: number;
  errors: number;
}

const DIFFICULTY_CONFIG: Record<DifficultyKey, DifficultyConfig> = {
  easy: {
    key: 'easy',
    label: 'Fácil',
    pairs: 4,
    pointsPerPair: 10,
    completionBonus: 20,
    fastTimeLimit: 45,
    fastTimeBonus: 20,
    errorPenalty: 1,
    terms: [
      { term: 'Leito', description: 'Local de cuidado e recuperacao' },
      { term: 'Exame', description: 'Avaliacao para apoiar o cuidado' },
      { term: 'Vacina', description: 'Protecao contra doencas' },
      { term: 'Medico', description: 'Profissional de atendimento clinico' }
    ]
  },
  medium: {
    key: 'medium',
    label: 'Médio',
    pairs: 8,
    pointsPerPair: 20,
    completionBonus: 50,
    fastTimeLimit: 90,
    fastTimeBonus: 40,
    errorPenalty: 2,
    terms: [
      { term: 'Higiene', description: 'Pratica essencial de prevencao' },
      { term: 'Triagem', description: 'Classificacao inicial do atendimento' },
      { term: 'Paciente', description: 'Pessoa atendida pela equipe' },
      { term: 'Cuidado', description: 'Assistencia prestada com seguranca' },
      { term: 'EPI', description: 'Equipamento de protecao individual' },
      { term: 'Medicacao', description: 'Administracao segura de medicamentos' },
      { term: 'Acolhimento', description: 'Recepcao humanizada do paciente' },
      { term: 'Seguranca', description: 'Prevencao de riscos assistenciais' }
    ]
  },
  hard: {
    key: 'hard',
    label: 'Difícil',
    pairs: 12,
    pointsPerPair: 30,
    completionBonus: 90,
    fastTimeLimit: 150,
    fastTimeBonus: 60,
    errorPenalty: 3,
    terms: [
      { term: 'Prontuario', description: 'Registro clinico do paciente' },
      { term: 'Enfermagem', description: 'Equipe essencial da assistencia' },
      { term: 'Biosseguranca', description: 'Controle de riscos biologicos' },
      { term: 'Diagnostico', description: 'Identificacao de condicao clinica' },
      { term: 'Prescricao', description: 'Orientacao formal de tratamento' },
      { term: 'Farmacovigilancia', description: 'Monitoramento de eventos a medicamentos' },
      { term: 'Humanizacao', description: 'Cuidado centrado na pessoa' },
      { term: 'Esterilizacao', description: 'Eliminacao de microrganismos' },
      { term: 'Classificacao', description: 'Priorizacao por risco assistencial' },
      { term: 'Acreditacao', description: 'Avaliacao de qualidade institucional' },
      { term: 'Hemovigilancia', description: 'Monitoramento do ciclo do sangue' },
      { term: 'Notificacao', description: 'Registro de evento ou ocorrencia' }
    ]
  }
};

@Component({
  selector: 'app-memory-game',
  standalone: false,
  templateUrl: './memory-game.component.html',
  styleUrl: './memory-game.component.css'
})
export class MemoryGameComponent implements OnInit, OnDestroy {
  readonly difficultyOptions = Object.values(DIFFICULTY_CONFIG);

  cards: MemoryCard[] = [];
  flippedCards: MemoryCard[] = [];
  selectedDifficulty: DifficultyKey = 'medium';
  moves = 0;
  errors = 0;
  matchedPairs = 0;
  score = 0;
  isLocked = false;
  isFinished = false;
  finalScore = 0;
  elapsedSeconds = 0;
  timeBonus = 0;
  lastGameResult?: MemoryGameResult;

  private timerId?: number;
  private fallbackRandomSeed = this.createFallbackRandomSeed();
  private readonly identityStorageKey = 'publicAccessIdentity';
  private readonly gameIdentityStorageKey = 'gamesCurrentIdentity';

  constructor(private pointsService: PointsService) { }

  ngOnInit(): void {
    this.startGame();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  changeDifficulty(difficulty: DifficultyKey): void {
    if (this.selectedDifficulty === difficulty) {
      return;
    }

    this.selectedDifficulty = difficulty;
    this.startGame();
  }

  startGame(): void {
    this.fallbackRandomSeed = this.createFallbackRandomSeed();
    this.cards = this.shuffleCards(this.createDeck());
    this.flippedCards = [];
    this.moves = 0;
    this.errors = 0;
    this.matchedPairs = 0;
    this.score = 0;
    this.isLocked = false;
    this.isFinished = false;
    this.finalScore = 0;
    this.elapsedSeconds = 0;
    this.timeBonus = 0;
    this.lastGameResult = undefined;
    this.startTimer();
  }

  flipCard(card: MemoryCard): void {
    if (this.isLocked || card.isFlipped || card.isMatched || this.isFinished) {
      return;
    }

    card.isFlipped = true;
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.checkMatch();
    }
  }

  finishGame(score: number, difficulty: DifficultyKey, time: number): void {
    this.finalScore = score;
    this.score = score;
    this.isFinished = true;
    this.stopTimer();
    this.lastGameResult = {
      score,
      difficulty,
      timeInSeconds: time,
      matchedPairs: this.matchedPairs,
      totalPairs: this.terms.length,
      moves: this.moves,
      errors: this.errors
    };

    this.pointsService.registerFromSavedIdentity({
      eventType: 'GAME_MEMORY',
      difficulty,
      referenceId: 'memory-game',
      referenceTitle: 'Memória Hospitalar',
      timeSeconds: time
    }).subscribe({
      complete: () => this.clearGameIdentity()
    });
  }

  get progress(): number {
    return Math.round((this.matchedPairs / this.terms.length) * 100);
  }

  get currentConfig(): DifficultyConfig {
    return DIFFICULTY_CONFIG[this.selectedDifficulty];
  }

  get terms(): MemoryTerm[] {
    return this.currentConfig.terms;
  }

  get pointsPerPair(): number {
    return this.currentConfig.pointsPerPair;
  }

  get maxScore(): number {
    return this.terms.length * this.pointsPerPair + this.currentConfig.completionBonus + this.currentConfig.fastTimeBonus;
  }

  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }

  private checkMatch(): void {
    const [firstCard, secondCard] = this.flippedCards;

    if (firstCard.pairId === secondCard.pairId) {
      firstCard.isMatched = true;
      secondCard.isMatched = true;
      this.matchedPairs++;
      this.score += this.pointsPerPair;
      this.flippedCards = [];

      if (this.matchedPairs === this.terms.length) {
        this.timeBonus = this.calculateTimeBonus();
        this.finishGame(
          this.score + this.currentConfig.completionBonus + this.timeBonus,
          this.selectedDifficulty,
          this.elapsedSeconds
        );
      }

      return;
    }

    this.isLocked = true;
    this.errors++;
    this.score = Math.max(0, this.score - this.currentConfig.errorPenalty);

    window.setTimeout(() => {
      firstCard.isFlipped = false;
      secondCard.isFlipped = false;
      this.flippedCards = [];
      this.isLocked = false;
    }, 800);
  }

  private calculateTimeBonus(): number {
    return this.elapsedSeconds <= this.currentConfig.fastTimeLimit
      ? this.currentConfig.fastTimeBonus
      : 0;
  }

  private createDeck(): MemoryCard[] {
    return this.terms.flatMap((item, index) => [
      {
        id: index * 2,
        pairId: index,
        term: item.term,
        description: item.description,
        isFlipped: false,
        isMatched: false
      },
      {
        id: index * 2 + 1,
        pairId: index,
        term: item.term,
        description: item.description,
        isFlipped: false,
        isMatched: false
      }
    ]);
  }

  private shuffleCards(cards: MemoryCard[]): MemoryCard[] {
    const shuffledCards = [...cards];

    for (let index = shuffledCards.length - 1; index > 0; index--) {
      const swapIndex = this.getRandomInt(index + 1);
      [shuffledCards[index], shuffledCards[swapIndex]] = [shuffledCards[swapIndex], shuffledCards[index]];
    }

    return shuffledCards;
  }

  private getRandomInt(maxExclusive: number): number {
    const cryptoApi = globalThis.crypto;

    if (cryptoApi?.getRandomValues) {
      const randomValues = new Uint32Array(1);
      cryptoApi.getRandomValues(randomValues);

      return randomValues[0] % maxExclusive;
    }

    this.fallbackRandomSeed = (1664525 * this.fallbackRandomSeed + 1013904223) >>> 0;

    return this.fallbackRandomSeed % maxExclusive;
  }

  private createFallbackRandomSeed(): number {
    const performanceTime = Math.floor((globalThis.performance?.now() ?? 0) * 1000);

    return (Date.now() ^ performanceTime) >>> 0;
  }

  private startTimer(): void {
    this.stopTimer();

    this.timerId = window.setInterval(() => {
      this.elapsedSeconds++;
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private clearGameIdentity(): void {
    sessionStorage.removeItem(this.identityStorageKey);
    sessionStorage.removeItem(this.gameIdentityStorageKey);
  }
}
