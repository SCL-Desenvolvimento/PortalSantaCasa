import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { CourseService } from '../../../core/services/course.service';
import { CourseView } from '../../../models/course.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-course-viewer',
  standalone: false,
  templateUrl: './course-viewer.component.html',
  styleUrls: ['./course-viewer.component.css']
})
export class CourseViewerComponent implements OnInit, OnDestroy {
  currentUserId = 0;
  assignedCourses: CourseView[] = [];
  filteredCourses: CourseView[] = [];
  selectedCourse: CourseView | null = null;
  safePdfUrl: SafeResourceUrl | null = null;
  isLoading = false;
  isSavingProgress = false;
  message = '';
  searchTerm = '';
  statusFilter: 'all' | 'pending' | 'completed' = 'all';
  private lastReportedSecond = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserInfo()?.id ?? 0;
    if (!this.currentUserId) { this.message = 'Usuário não identificado.'; return; }
    this.loadAssignedCourses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAssignedCourses(): void {
    this.isLoading = true;
    this.courseService.getAssignedCourses(this.currentUserId).pipe(takeUntil(this.destroy$)).subscribe({
      next: courses => {
        this.assignedCourses = courses;
        this.applyFilters();
        this.isLoading = false;
        if (!this.selectedCourse && courses.length) this.selectCourse(courses[0]);
      },
      error: () => { this.message = 'Erro ao carregar os conteúdos atribuídos.'; this.isLoading = false; }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    this.filteredCourses = this.assignedCourses.filter(course => {
      const textMatch = !term || course.title.toLocaleLowerCase().includes(term) || course.description.toLocaleLowerCase().includes(term);
      const statusMatch = this.statusFilter === 'all' || (this.statusFilter === 'completed' ? course.isWatched : !course.isWatched);
      return textMatch && statusMatch;
    });
  }

  setStatusFilter(filter: 'all' | 'pending' | 'completed'): void { this.statusFilter = filter; this.applyFilters(); }

  selectCourse(course: CourseView): void {
    this.selectedCourse = course;
    this.lastReportedSecond = Math.floor(course.lastPositionSeconds || 0);
    this.safePdfUrl = course.contentType === 'pdf'
      ? this.sanitizer.bypassSecurityTrustResourceUrl(`${course.contentUrl}#toolbar=1&navpanes=1&view=FitH`)
      : null;
    if (!course.firstAccessedAt && !course.isWatched) this.saveProgress(Math.max(course.progressPercentage || 0, 5), 0, 0, false);
  }

  onVideoLoaded(video: HTMLVideoElement): void {
    if (this.selectedCourse?.lastPositionSeconds && video.currentTime < 1) {
      video.currentTime = Math.min(this.selectedCourse.lastPositionSeconds, Math.max(video.duration - 1, 0));
    }
  }

  onVideoProgress(video: HTMLVideoElement): void {
    if (!this.selectedCourse || !video.duration || this.selectedCourse.isWatched) return;
    const current = Math.floor(video.currentTime);
    if (current - this.lastReportedSecond < 10) return;
    const activity = Math.min(60, Math.max(0, current - this.lastReportedSecond));
    this.lastReportedSecond = current;
    const percentage = Math.min(99, Math.floor((video.currentTime / video.duration) * 100));
    this.saveProgress(percentage, video.currentTime, video.duration, false, activity);
  }

  onVideoFinished(video: HTMLVideoElement): void {
    this.saveProgress(100, video.duration, video.duration, true);
  }

  confirmPdfRead(): void { this.saveProgress(100, 0, 0, true, 0); }

  private saveProgress(progress: number, position: number, duration: number, completed: boolean, activitySeconds = 0): void {
    if (!this.selectedCourse || this.isSavingProgress) return;
    const courseId = this.selectedCourse.id;
    this.isSavingProgress = true;
    this.courseService.updateProgress({ courseId, progressPercentage: progress, positionSeconds: position,
      durationSeconds: duration, activitySeconds, completed }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSavingProgress = false;
        const course = this.assignedCourses.find(item => item.id === courseId);
        const isComplete = completed || progress >= 90;
        if (course) {
          course.progressPercentage = isComplete ? 100 : Math.max(course.progressPercentage || 0, progress);
          course.lastPositionSeconds = position;
          course.firstAccessedAt ||= new Date();
          course.lastAccessedAt = new Date();
          if (isComplete) course.isWatched = true;
        }
        this.applyFilters();
        if (isComplete) this.message = `“${course?.title}” concluído com sucesso.`;
      },
      error: () => { this.isSavingProgress = false; this.message = 'Não foi possível registrar o progresso.'; }
    });
  }

  get completedCount(): number { return this.assignedCourses.filter(course => course.isWatched).length; }
  get progressCount(): number { return this.assignedCourses.filter(course => !course.isWatched && course.progressPercentage > 0).length; }
}
