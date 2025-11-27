import { Component, OnInit } from '@angular/core';
import { CourseService } from '../../../core/services/course.service';
import { CourseView } from '../../../models/course-view.model';
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

  constructor(private courseService: CourseService, private authService: AuthService) { }

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
        this.assignedCourses = courses;
        this.isLoading = false;
      },
      error: (err) => {
        this.message = 'Erro ao carregar cursos atribuídos.';
        console.error(err);
      }
    });
  }

  selectCourse(course: CourseView): void {
    this.selectedCourse = course;
  }

  // Simula o evento de vídeo assistido por completo
  simulateVideoWatched(): void {
    if (!this.selectedCourse || this.selectedCourse.isWatched) return;

    this.isLoading = true;
    this.message = 'Marcando curso como assistido...';
    this.courseService.markAsWatched({
      userId: this.currentUserId,
      courseId: this.selectedCourse.id
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.message = `Curso "${this.selectedCourse?.title}" marcado como assistido com sucesso!`;
        // Atualiza o status localmente para refletir a mudança
        if (this.selectedCourse) {
          this.selectedCourse.isWatched = true;
        }
        const index = this.assignedCourses.findIndex(c => c.id === this.selectedCourse?.id);
        if (index !== -1) {
          this.assignedCourses[index].isWatched = true;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.message = 'Erro ao marcar curso como assistido.';
        console.error(err);
      }
    });
  }
}
