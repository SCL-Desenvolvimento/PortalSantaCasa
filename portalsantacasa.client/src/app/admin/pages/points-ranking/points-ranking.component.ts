import { Component, OnInit } from '@angular/core';
import { PointEventResponse } from '../../../models/points.model';
import { PointsService } from '../../../core/services/points.service';

interface RankingRow {
  position: number;
  re: string;
  name: string;
  sector: string;
  totalPoints: number;
  totalEvents: number;
  lastActivity: string;
}

interface EventTypeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-points-ranking',
  standalone: false,
  templateUrl: './points-ranking.component.html',
  styleUrl: './points-ranking.component.css'
})
export class PointsRankingComponent implements OnInit {
  events: PointEventResponse[] = [];
  ranking: RankingRow[] = [];
  topThree: RankingRow[] = [];
  sectors: string[] = [];
  eventTypeOptions: EventTypeOption[] = [];
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  selectedSector = '';
  selectedEventType = '';
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  readonly monthOptions = [
    { label: 'Janeiro', value: 1 },
    { label: 'Fevereiro', value: 2 },
    { label: 'Março', value: 3 },
    { label: 'Abril', value: 4 },
    { label: 'Maio', value: 5 },
    { label: 'Junho', value: 6 },
    { label: 'Julho', value: 7 },
    { label: 'Agosto', value: 8 },
    { label: 'Setembro', value: 9 },
    { label: 'Outubro', value: 10 },
    { label: 'Novembro', value: 11 },
    { label: 'Dezembro', value: 12 }
  ];

  readonly yearOptions = this.buildYearOptions();

  constructor(private pointsService: PointsService) { }

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.pointsService.getEvents({ page: 1, pageSize: 500 }).subscribe({
      next: (events) => {
        this.events = events;
        this.sectors = this.getUniqueValues(events.map(event => event.sector || '').filter(Boolean));
        this.eventTypeOptions = this.getEventTypeOptions(events);
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar o ranking de pontuação.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const filteredEvents = this.events.filter(event => this.matchesFilters(event));
    this.ranking = this.buildRanking(filteredEvents);
    this.topThree = this.ranking.slice(0, 3);
  }

  clearFilters(): void {
    const now = new Date();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear = now.getFullYear();
    this.selectedSector = '';
    this.selectedEventType = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  getEventTypeLabel(eventType: string): string {
    const labels: Record<string, string> = {
      NEWS_VIEW: 'Notícias',
      ANNOUNCEMENT_VIEW: 'Comunicados',
      QUALITY_VIEW: 'Qualidade',
      GAME_MEMORY: 'Memória Hospitalar',
      GAME_WORD_SEARCH: 'Caça-palavras Hospitalar'
    };

    return labels[eventType] || eventType;
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private matchesFilters(event: PointEventResponse): boolean {
    const eventDate = new Date(event.createdAt);
    const term = this.searchTerm.trim().toLowerCase();
    const matchesMonth = eventDate.getMonth() + 1 === Number(this.selectedMonth);
    const matchesYear = eventDate.getFullYear() === Number(this.selectedYear);
    const matchesSector = !this.selectedSector || event.sector === this.selectedSector;
    const matchesEventType = !this.selectedEventType || event.eventType === this.selectedEventType;
    const matchesSearch = !term ||
      event.name.toLowerCase().includes(term) ||
      event.re.toLowerCase().includes(term);

    return matchesMonth && matchesYear && matchesSector && matchesEventType && matchesSearch;
  }

  private buildRanking(events: PointEventResponse[]): RankingRow[] {
    const grouped = new Map<string, RankingRow>();

    events.forEach(event => {
      const existing = grouped.get(event.re);

      if (!existing) {
        grouped.set(event.re, {
          position: 0,
          re: event.re,
          name: event.name,
          sector: event.sector || '-',
          totalPoints: event.points,
          totalEvents: 1,
          lastActivity: event.createdAt
        });
        return;
      }

      existing.name = event.name || existing.name;
      existing.sector = event.sector || existing.sector;
      existing.totalPoints += event.points;
      existing.totalEvents++;

      if (new Date(event.createdAt) > new Date(existing.lastActivity)) {
        existing.lastActivity = event.createdAt;
      }
    });

    return Array.from(grouped.values())
      .sort((first, second) =>
        second.totalPoints - first.totalPoints ||
        second.totalEvents - first.totalEvents ||
        first.name.localeCompare(second.name)
      )
      .map((row, index) => ({ ...row, position: index + 1 }));
  }

  private getUniqueValues(values: string[]): string[] {
    return Array.from(new Set(values)).sort((first, second) => first.localeCompare(second));
  }

  private getEventTypeOptions(events: PointEventResponse[]): EventTypeOption[] {
    return this.getUniqueValues(events.map(event => event.eventType)).map(eventType => ({
      value: eventType,
      label: this.getEventTypeLabel(eventType)
    }));
  }

  private buildYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - index);
  }
}
