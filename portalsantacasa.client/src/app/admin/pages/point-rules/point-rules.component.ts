import { Component, OnInit } from '@angular/core';
import { PointRule } from '../../../models/points.model';
import { PointsService } from '../../../core/services/points.service';

interface EditablePointRule extends PointRule {
  isSaving?: boolean;
}

@Component({
  selector: 'app-point-rules',
  standalone: false,
  templateUrl: './point-rules.component.html',
  styleUrl: './point-rules.component.css'
})
export class PointRulesComponent implements OnInit {
  rules: EditablePointRule[] = [];
  filteredRules: EditablePointRule[] = [];
  eventTypeFilter = '';
  statusFilter: '' | 'active' | 'inactive' = '';
  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private pointsService: PointsService) { }

  ngOnInit(): void {
    this.loadRules();
  }

  loadRules(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.pointsService.getRules().subscribe({
      next: (rules) => {
        this.rules = rules.map(rule => ({
          ...rule,
          bonus: rule.bonus ?? rule.bonusPoints ?? 0
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar as regras de pontuação.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredRules = this.rules.filter(rule => {
      const matchesEventType = !this.eventTypeFilter || rule.eventType === this.eventTypeFilter;
      const matchesStatus = !this.statusFilter ||
        (this.statusFilter === 'active' && rule.isActive) ||
        (this.statusFilter === 'inactive' && !rule.isActive);
      const matchesSearch = !term ||
        rule.eventType.toLowerCase().includes(term) ||
        (rule.difficulty || '').toLowerCase().includes(term) ||
        (rule.description || '').toLowerCase().includes(term);

      return matchesEventType && matchesStatus && matchesSearch;
    });
  }

  clearFilters(): void {
    this.eventTypeFilter = '';
    this.statusFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  saveRule(rule: EditablePointRule): void {
    if (rule.points < 0 || (rule.bonus ?? 0) < 0) {
      this.errorMessage = 'Pontos e bônus não podem ser negativos.';
      return;
    }

    rule.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.pointsService.updateRule(rule.id, {
      points: Number(rule.points),
      bonus: Number(rule.bonus ?? 0),
      isActive: rule.isActive,
      description: rule.description?.trim() || null
    }).subscribe({
      next: (updatedRule) => {
        rule.points = updatedRule.points;
        rule.bonus = updatedRule.bonus ?? updatedRule.bonusPoints ?? rule.bonus ?? 0;
        rule.isActive = updatedRule.isActive;
        rule.description = updatedRule.description;
        rule.isSaving = false;
        this.successMessage = 'Regra de pontuação atualizada com sucesso.';
        this.applyFilters();
      },
      error: () => {
        rule.isSaving = false;
        this.errorMessage = 'Não foi possível salvar a regra de pontuação.';
      }
    });
  }

  get eventTypeOptions(): string[] {
    return Array.from(new Set(this.rules.map(rule => rule.eventType)))
      .sort((first, second) => first.localeCompare(second));
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

  getDifficultyLabel(difficulty?: string | null): string {
    const labels: Record<string, string> = {
      easy: 'Fácil',
      medium: 'Médio',
      hard: 'Difícil'
    };

    return difficulty ? labels[difficulty] || difficulty : 'Geral';
  }
}
