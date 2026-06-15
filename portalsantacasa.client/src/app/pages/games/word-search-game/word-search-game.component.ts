import { Component, OnDestroy, OnInit } from '@angular/core';

interface WordSearchCell {
  row: number;
  col: number;
  letter: string;
  key: string;
  isFound: boolean;
}

interface WordPlacement {
  word: string;
  row: number;
  col: number;
  rowStep: number;
  colStep: number;
}

interface WordDirection {
  rowStep: number;
  colStep: number;
}

@Component({
  selector: 'app-word-search-game',
  standalone: false,
  templateUrl: './word-search-game.component.html',
  styleUrl: './word-search-game.component.css'
})
export class WordSearchGameComponent implements OnInit, OnDestroy {
  readonly words = [
    'ENFERMAGEM',
    'PACIENTE',
    'CUIDADO',
    'HIGIENE',
    'VACINA',
    'MEDICO',
    'EXAME',
    'TRIAGEM',
    'PRONTUARIO',
    'SEGURANCA'
  ];

  readonly gridSize = 12;
  readonly pointsPerWord = 10;
  readonly completionBonus = 50;
  readonly directions: WordDirection[] = [
    { rowStep: 0, colStep: 1 },
    { rowStep: 0, colStep: -1 },
    { rowStep: 1, colStep: 0 },
    { rowStep: -1, colStep: 0 },
    { rowStep: 1, colStep: 1 },
    { rowStep: 1, colStep: -1 },
    { rowStep: -1, colStep: 1 },
    { rowStep: -1, colStep: -1 }
  ];

  grid: WordSearchCell[][] = [];
  selectedKeys = new Set<string>();
  foundWords = new Set<string>();
  score = 0;
  finalScore = 0;
  elapsedSeconds = 0;
  isSelecting = false;
  isFinished = false;
  statusMessage = 'Selecione as letras de uma palavra na grade.';

  private currentSelection: WordSearchCell[] = [];
  private clickStartCell?: WordSearchCell;
  private hasDragged = false;
  private timerId?: number;
  private fallbackRandomSeed = this.createFallbackRandomSeed();

  ngOnInit(): void {
    this.startGame();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startGame(): void {
    this.fallbackRandomSeed = this.createFallbackRandomSeed();
    this.grid = this.generateGrid();
    this.selectedKeys.clear();
    this.foundWords.clear();
    this.currentSelection = [];
    this.clickStartCell = undefined;
    this.hasDragged = false;
    this.score = 0;
    this.finalScore = 0;
    this.elapsedSeconds = 0;
    this.isSelecting = false;
    this.isFinished = false;
    this.statusMessage = 'Selecione as letras de uma palavra na grade.';
    this.startTimer();
  }

  startSelection(cell: WordSearchCell): void {
    if (this.isFinished) {
      return;
    }

    this.isSelecting = true;
    this.hasDragged = false;
    this.currentSelection = [cell];
    this.updateSelectedKeys(this.currentSelection);
  }

  extendSelection(cell: WordSearchCell): void {
    if (!this.isSelecting || this.isFinished) {
      return;
    }

    const firstCell = this.currentSelection[0];
    const selection = this.getCellsBetween(firstCell, cell);

    if (!selection.length) {
      return;
    }

    this.hasDragged = selection.length > 1;
    this.currentSelection = selection;
    this.updateSelectedKeys(selection);
  }

  endSelection(): void {
    if (!this.isSelecting || this.isFinished) {
      return;
    }

    this.isSelecting = false;

    if (this.hasDragged && this.currentSelection.length > 1) {
      this.validateSelection(this.currentSelection);
      this.clickStartCell = undefined;
      return;
    }

    this.currentSelection = [];
    this.selectedKeys.clear();
  }

  selectByClick(cell: WordSearchCell): void {
    if (this.isFinished || this.isSelecting) {
      return;
    }

    if (!this.clickStartCell) {
      this.clickStartCell = cell;
      this.updateSelectedKeys([cell]);
      this.statusMessage = 'Agora selecione a letra final da palavra.';
      return;
    }

    const selection = this.getCellsBetween(this.clickStartCell, cell);

    if (!selection.length || selection.length === 1) {
      this.clickStartCell = cell;
      this.updateSelectedKeys([cell]);
      return;
    }

    this.validateSelection(selection);
    this.clickStartCell = undefined;
  }

  finishGame(score: number): void {
    this.finalScore = score;
    this.score = score;
    this.isFinished = true;
    this.isSelecting = false;
    this.selectedKeys.clear();
    this.stopTimer();

    // Futuramente, integrar aqui com API de pontuacao.
  }

  isWordFound(word: string): boolean {
    return this.foundWords.has(word);
  }

  isCellSelected(cell: WordSearchCell): boolean {
    return this.selectedKeys.has(cell.key);
  }

  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }

  get progress(): number {
    return Math.round((this.foundWords.size / this.words.length) * 100);
  }

  private validateSelection(selection: WordSearchCell[]): void {
    const selectedWord = selection.map(cell => cell.letter).join('');
    const reversedWord = [...selectedWord].reverse().join('');
    const foundWord = this.words.find(word => word === selectedWord || word === reversedWord);

    if (!foundWord) {
      this.statusMessage = 'Essa seleção não formou uma palavra da lista.';
      this.clearSelectionSoon();
      return;
    }

    if (this.foundWords.has(foundWord)) {
      this.statusMessage = `${foundWord} ja foi encontrada.`;
      this.clearSelectionSoon();
      return;
    }

    this.foundWords.add(foundWord);
    selection.forEach(cell => cell.isFound = true);
    this.score += this.pointsPerWord;
    this.selectedKeys.clear();
    this.statusMessage = `${foundWord} encontrada. +${this.pointsPerWord} pontos.`;

    if (this.foundWords.size === this.words.length) {
      this.finishGame(this.score + this.completionBonus);
    }
  }

  private clearSelectionSoon(): void {
    window.setTimeout(() => {
      this.selectedKeys.clear();
      this.currentSelection = [];
    }, 500);
  }

  private updateSelectedKeys(selection: WordSearchCell[]): void {
    this.selectedKeys = new Set(selection.map(cell => cell.key));
  }

  private getCellsBetween(start: WordSearchCell, end: WordSearchCell): WordSearchCell[] {
    const rowDiff = end.row - start.row;
    const colDiff = end.col - start.col;
    const rowStep = Math.sign(rowDiff);
    const colStep = Math.sign(colDiff);
    const isStraightLine = rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff);

    if (!isStraightLine) {
      return [];
    }

    const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff)) + 1;
    const cells: WordSearchCell[] = [];

    for (let index = 0; index < length; index++) {
      const row = start.row + rowStep * index;
      const col = start.col + colStep * index;
      cells.push(this.grid[row][col]);
    }

    return cells;
  }

  private generateGrid(): WordSearchCell[][] {
    const maxGridAttempts = 80;

    for (let attempt = 0; attempt < maxGridAttempts; attempt++) {
      const letters = this.createEmptyLetterGrid();
      const shuffledWords = this.shuffleArray([...this.words]);
      const allWordsPlaced = shuffledWords.every(word => this.tryPlaceWord(letters, word));

      if (allWordsPlaced) {
        this.fillEmptyCells(letters);
        return this.toWordSearchGrid(letters);
      }
    }

    throw new Error('Nao foi possivel gerar uma grade de caca-palavras valida.');
  }

  private placeWord(letters: string[][], placement: WordPlacement): void {
    [...placement.word].forEach((letter, index) => {
      const row = placement.row + placement.rowStep * index;
      const col = placement.col + placement.colStep * index;
      letters[row][col] = letter;
    });
  }

  private tryPlaceWord(letters: string[][], word: string): boolean {
    const maxPlacementAttempts = 160;

    for (let attempt = 0; attempt < maxPlacementAttempts; attempt++) {
      const shuffledDirections = this.shuffleArray([...this.directions]);
      const row = this.getRandomInt(this.gridSize);
      const col = this.getRandomInt(this.gridSize);

      for (const direction of shuffledDirections) {
        const placement: WordPlacement = {
          word,
          row,
          col,
          rowStep: direction.rowStep,
          colStep: direction.colStep
        };

        if (this.canPlaceWord(letters, placement)) {
          this.placeWord(letters, placement);
          return true;
        }
      }
    }

    return false;
  }

  private canPlaceWord(letters: string[][], placement: WordPlacement): boolean {
    return [...placement.word].every((letter, index) => {
      const row = placement.row + placement.rowStep * index;
      const col = placement.col + placement.colStep * index;
      const existingLetter = letters[row]?.[col];

      return existingLetter !== undefined && (!existingLetter || existingLetter === letter);
    });
  }

  private fillEmptyCells(letters: string[][]): void {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (!letters[row][col]) {
          letters[row][col] = alphabet[this.getRandomInt(alphabet.length)];
        }
      }
    }
  }

  private createEmptyLetterGrid(): string[][] {
    return Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(''));
  }

  private toWordSearchGrid(letters: string[][]): WordSearchCell[][] {
    return letters.map((row, rowIndex) =>
      row.map((letter, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        letter,
        key: `${rowIndex}-${colIndex}`,
        isFound: false
      }))
    );
  }

  private shuffleArray<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index--) {
      const swapIndex = this.getRandomInt(index + 1);
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }

    return items;
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
}
