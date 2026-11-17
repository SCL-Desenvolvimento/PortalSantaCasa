import { afterNextRender, Component, ElementRef, inject, Injector, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CourseService } from '../../../core/services/course.service';
import { CourseView } from '../../../models/course.model';
import { AuthService } from '../../../core/services/auth.service';

type ViewerStatus = 'all' | 'pending' | 'completed' | 'overdue';

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
  courseGroups: { name: string | null; courses: CourseView[] }[] = [];
  selectedCourse: CourseView | null = null;
  safePdfUrl: SafeResourceUrl | null = null;
  isLoading = false;
  loadError = false;
  isSavingProgress = false;
  message = '';
  searchTerm = '';
  statusFilter: ViewerStatus = 'all';
  private lastReportedSecond = 0;
  private requestedCourseId = 0;
  private destroy$ = new Subject<void>();
  private readonly injector = inject(Injector);
  @ViewChild('courseHeading') private courseHeading?: ElementRef<HTMLElement>;

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserInfo()?.id ?? 0;
    if (!this.currentUserId) { this.message = 'Usuário não identificado.'; return; }
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.requestedCourseId = Number(params.get('course')) || 0;
      const course = this.assignedCourses.find(item => item.id === this.requestedCourseId);
      if (course && course.id !== this.selectedCourse?.id) this.selectCourse(course);
    });
    this.loadAssignedCourses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAssignedCourses(): void {
    this.isLoading = true;
    this.loadError = false;
    this.courseService.getAssignedCourses(this.currentUserId).pipe(takeUntil(this.destroy$)).subscribe({
      next: courses => {
        this.assignedCourses = courses;
        this.applyFilters();
        this.isLoading = false;
        const targetId = this.requestedCourseId || this.selectedCourse?.id;
        const target = courses.find(course => course.id === targetId) ?? courses[0];
        if (target) this.selectCourse(target);
        else this.selectedCourse = null;
      },
      error: () => { this.loadError = true; this.isLoading = false; }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    this.filteredCourses = this.assignedCourses.filter(course => {
      const textMatch = !term || course.title.toLocaleLowerCase().includes(term) ||
        course.description.toLocaleLowerCase().includes(term) || course.trackName?.toLocaleLowerCase().includes(term);
      if (!textMatch) return false;
      if (this.statusFilter === 'overdue') return !course.isWatched && !!course.isOverdue;
      return this.statusFilter === 'all' || course.isWatched === (this.statusFilter === 'completed');
    });
    const groups = new Map<string, { name: string | null; courses: CourseView[] }>();
    for (const course of this.filteredCourses) {
      const name = course.trackName?.trim() || null;
      const key = name?.toLocaleLowerCase() || '';
      const group = groups.get(key) ?? { name, courses: [] };
      group.courses.push(course);
      groups.set(key, group);
    }
    this.courseGroups = [...groups.values()].sort((left, right) =>
      (left.name ?? '\uffff').localeCompare(right.name ?? '\uffff', 'pt-BR'));
  }

  setStatusFilter(filter: ViewerStatus): void { this.statusFilter = filter; this.applyFilters(); }

  openCourse(course: CourseView): void {
    this.selectCourse(course);
    if (!window.matchMedia('(max-width: 1050px)').matches) return;
    afterNextRender(() => {
      const heading = this.courseHeading?.nativeElement;
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start' });
    }, { injector: this.injector });
  }

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
    const cycleId = this.selectedCourse.cycleId;
    this.isSavingProgress = true;
    this.courseService.updateProgress({ courseId, cycleId, progressPercentage: progress, positionSeconds: position,
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
          if (isComplete) {
            if (!course.isWatched && course.renewalDays) {
              course.renewalAt = new Date(Date.now() + course.renewalDays * 86_400_000).toISOString();
            }
            course.isWatched = true;
            course.isOverdue = false;
          }
        }
        this.applyFilters();
        if (isComplete) this.message = `“${course?.title}” concluído com sucesso.`;
      },
      error: error => {
        this.isSavingProgress = false;
        if (error.status === 404) {
          this.message = 'A atribuição foi atualizada. Consulte o conteúdo na lista.';
          this.loadAssignedCourses();
          return;
        }
        this.message = 'Não foi possível registrar o progresso.';
      }
    });
  }

  get completedCount(): number { return this.assignedCourses.filter(course => course.isWatched).length; }
  get progressCount(): number {
    return this.assignedCourses.filter(course => !course.isWatched && !course.isOverdue && course.progressPercentage > 0).length;
  }
  get overdueCount(): number { return this.assignedCourses.filter(course => !course.isWatched && course.isOverdue).length; }
}
