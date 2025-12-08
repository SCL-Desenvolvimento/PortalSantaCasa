import { Component, OnInit } from '@angular/core';
import { CourseService } from '../../../core/services/course.service';
import { CourseTracking } from '../../../models/course.model';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-course-tracking',
  standalone: false,
  templateUrl: './course-tracking.component.html',
  styleUrls: ['./course-tracking.component.css']
})
export class CourseTrackingComponent implements OnInit {
  courseIdToTrack!: number;
  trackingData: CourseTracking[] = [];
  filteredTrackingData: CourseTracking[] = [];
  searchTerm: string = '';
  statusFilter: 'all' | 'watched' | 'not-watched' = 'all';
  message: string = '';

  constructor(private courseService: CourseService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.courseIdToTrack = Number(this.route.snapshot.paramMap.get('id')) || 0;

    if (!this.courseIdToTrack) {
      this.message = 'Curso inválido.';
      return;
    }

    this.loadTrackingData();
  }

  loadTrackingData(): void {
    if (!this.courseIdToTrack) {
      this.message = 'Selecione um ID de curso para rastrear.';
      return;
    }

    this.courseService.getCourseTracking(this.courseIdToTrack).subscribe({
      next: (data) => {
        this.trackingData = data;
        this.applyFilters();
        this.message = data.length > 0 ? `Rastreamento para o curso ID ${this.courseIdToTrack} carregado.` : 'Nenhum dado de rastreamento encontrado.';
      },
      error: (err) => {
        this.message = 'Erro ao carregar dados de rastreamento.';
        console.error(err);
      }
    });
  }

  // Função auxiliar para formatar a data
  formatDate(date: Date | null): Date | null {
    return date ? new Date(date) : null;
  }

  // =====================
  // 📌 Busca e filtros
  // =====================
  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(filter: 'all' | 'watched' | 'not-watched'): void {
    this.statusFilter = filter;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredTrackingData = this.trackingData.filter(item => {
      const matchesSearch =
        !this.searchTerm ||
        item.userName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.userId.toString().includes(this.searchTerm);

      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'watched' && item.isWatched) ||
        (this.statusFilter === 'not-watched' && !item.isWatched);

      return matchesSearch && matchesStatus;
    });
  }
}
