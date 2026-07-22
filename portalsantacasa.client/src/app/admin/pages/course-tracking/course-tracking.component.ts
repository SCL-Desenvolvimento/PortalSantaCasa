import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { CourseTracking } from '../../../models/course.model';

@Component({ selector: 'app-course-tracking', standalone: false,
  templateUrl: './course-tracking.component.html', styleUrls: ['./course-tracking.component.css'] })
export class CourseTrackingComponent implements OnInit {
  courseIdToTrack = 0;
  trackingData: CourseTracking[] = [];
  filteredTrackingData: CourseTracking[] = [];
  searchTerm = '';
  departmentFilter = '';
  departments: string[] = [];
  statusFilter: 'all' | 'completed' | 'in-progress' | 'not-started' = 'all';
  message = '';
  isLoading = false;

  constructor(private courseService: CourseService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.courseIdToTrack = Number(this.route.snapshot.paramMap.get('id')) || 0;
    if (!this.courseIdToTrack) { this.message = 'Curso inválido.'; return; }
    this.loadTrackingData();
  }

  loadTrackingData(): void {
    this.isLoading = true;
    this.courseService.getCourseTracking(this.courseIdToTrack).subscribe({
      next: data => {
        this.trackingData = data;
        this.departments = [...new Set(data.map(item => item.department).filter((value): value is string => !!value))].sort();
        this.applyFilters(); this.isLoading = false;
      },
      error: () => { this.message = 'Erro ao carregar os dados de acompanhamento.'; this.isLoading = false; }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    this.filteredTrackingData = this.trackingData.filter(item => {
      const matchesSearch = !term || item.userName.toLocaleLowerCase().includes(term) ||
        (item.department || '').toLocaleLowerCase().includes(term) || item.userId.toString().includes(term);
      const matchesDepartment = !this.departmentFilter || item.department === this.departmentFilter;
      const status = this.statusOf(item);
      return matchesSearch && matchesDepartment && (this.statusFilter === 'all' || status === this.statusFilter);
    });
  }

  setStatusFilter(filter: 'all' | 'completed' | 'in-progress' | 'not-started'): void { this.statusFilter = filter; this.applyFilters(); }
  statusOf(item: CourseTracking): 'completed' | 'in-progress' | 'not-started' { return item.isWatched ? 'completed' : item.progressPercentage > 0 ? 'in-progress' : 'not-started'; }
  statusLabel(item: CourseTracking): string { return item.isWatched ? 'Concluído' : item.progressPercentage > 0 ? 'Em andamento' : 'Não iniciado'; }
  formatDate(date: Date | null): Date | null { return date ? new Date(date) : null; }
  formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}h ${minutes}min` : `${Math.max(1, minutes)} min`;
  }
  goBack(): void { this.router.navigate(['/admin/courses-register']); }
  get courseTitle(): string { return this.trackingData[0]?.courseTitle || `Curso #${this.courseIdToTrack}`; }
  get completedCount(): number { return this.trackingData.filter(item => item.isWatched).length; }
  get inProgressCount(): number { return this.trackingData.filter(item => !item.isWatched && item.progressPercentage > 0).length; }
  get notStartedCount(): number { return this.trackingData.filter(item => !item.isWatched && !item.progressPercentage).length; }
  get completionRate(): number { return this.trackingData.length ? Math.round(this.completedCount / this.trackingData.length * 100) : 0; }
}
