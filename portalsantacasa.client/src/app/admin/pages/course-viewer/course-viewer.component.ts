import { Component, OnInit } from '@angular/core';
import { CourseService } from '../../../core/services/course.service';
import { CourseView } from '../../../models/course.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-course-viewer',
  standalone: false,
  templateUrl: './course-viewer.component.html',
  styleUrls: ['./course-viewer.component.css']
})
export class CourseViewerComponent implements OnInit {
  currentUserId!: number;
  assignedCourses: CourseView[] = [];
  selectedCourse: CourseView | null = null;
  isLoading: boolean = false;
  message: string = '';

  constructor(
    private courseService: CourseService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getUserInfo();
    this.currentUserId = user?.id ?? 0;

    if (!this.currentUserId) {
      this.message = 'Usuário não identificado.';
      return;
    }

    this.loadAssignedCourses();
  }

  loadAssignedCourses(): void {
    this.isLoading = true;

    this.courseService.getAssignedCourses(this.currentUserId).subscribe({
      next: (courses) => {
        console.log(courses)
        this.assignedCourses = courses;
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Erro ao carregar cursos atribuídos.';
        this.isLoading = false;
      }
    });
  }

  selectCourse(course: CourseView): void {
    this.selectedCourse = course;
  }

  // 🚀 Marcação automática após o vídeo terminar
  onVideoFinished(): void {
    if (!this.selectedCourse || this.selectedCourse.isWatched) return;

    this.isLoading = true;
    this.message = 'Registrando conclusão do curso...';

    this.courseService.markAsWatched({
      userId: this.currentUserId,
      courseId: this.selectedCourse.id
    }).subscribe({
      next: () => {
        this.isLoading = false;

        if (this.selectedCourse) {
          this.selectedCourse.isWatched = true;
        }

        const index = this.assignedCourses.findIndex(
          c => c.id === this.selectedCourse?.id
        );

        if (index !== -1) {
          this.assignedCourses[index].isWatched = true;
        }

        this.message = `Curso "${this.selectedCourse?.title}" concluído com sucesso!`;
      },
      error: () => {
        this.isLoading = false;
        this.message = 'Erro ao registrar conclusão.';
      }
    });
  }
}
