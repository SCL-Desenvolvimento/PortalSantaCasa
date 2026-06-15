import { Component, OnInit } from '@angular/core';

interface MemoryCard {
  id: number;
  pairId: number;
  term: string;
  description: string;
  isFlipped: boolean;
  isMatched: boolean;
}

@Component({
  selector: 'app-memory-game',
  standalone: false,
  templateUrl: './memory-game.component.html',
  styleUrl: './memory-game.component.css'
})
export class MemoryGameComponent implements OnInit {
  cards: MemoryCard[] = [];
  flippedCards: MemoryCard[] = [];
  moves = 0;
  matchedPairs = 0;
  score = 0;
  isLocked = false;
  isFinished = false;
  finalScore = 0;

  readonly terms = [
    { term: 'Higienizacao', description: 'Limpeza correta das maos' },
    { term: 'Triagem', description: 'Classificacao inicial do atendimento' },
    { term: 'EPI', description: 'Equipamento de protecao individual' },
    { term: 'Prontuario', description: 'Registro clinico do paciente' },
    { term: 'Acolhimento', description: 'Recepcao humanizada do paciente' },
    { term: 'Seguranca', description: 'Prevencao de riscos assistenciais' },
    { term: 'Medicacao', description: 'Administracao segura de medicamentos' },
    { term: 'Leito', description: 'Local de cuidado e recuperacao' }
  ];

  ngOnInit(): void {
    this.startGame();
  }

  startGame(): void {
    this.cards = this.shuffleCards(this.createDeck());
    this.flippedCards = [];
    this.moves = 0;
    this.matchedPairs = 0;
    this.score = 0;
    this.isLocked = false;
    this.isFinished = false;
    this.finalScore = 0;
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

  finishGame(score: number): void {
    this.finalScore = score;
    this.isFinished = true;

    // Futuramente, integrar aqui com API de pontuacao.
  }

  get progress(): number {
    return Math.round((this.matchedPairs / this.terms.length) * 100);
  }

  private checkMatch(): void {
    const [firstCard, secondCard] = this.flippedCards;

    if (firstCard.pairId === secondCard.pairId) {
      firstCard.isMatched = true;
      secondCard.isMatched = true;
      this.matchedPairs++;
      this.updateScore();
      this.flippedCards = [];

      if (this.matchedPairs === this.terms.length) {
        this.finishGame(this.score);
      }

      return;
    }

    this.isLocked = true;

    window.setTimeout(() => {
      firstCard.isFlipped = false;
      secondCard.isFlipped = false;
      this.flippedCards = [];
      this.isLocked = false;
      this.updateScore();
    }, 800);
  }

  private updateScore(): void {
    const baseScore = this.matchedPairs * 120;
    const movePenalty = Math.max(0, this.moves - this.terms.length) * 8;

    this.score = Math.max(0, baseScore - movePenalty);
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
    return [...cards].sort(() => Math.random() - 0.5);
  }
}
