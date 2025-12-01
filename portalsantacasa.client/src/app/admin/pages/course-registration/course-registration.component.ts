import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/user.model';
import { CourseCreation, CourseTracking } from '../../../models/course.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2'
import { forkJoin, map } from 'rxjs';

@Component({
  selector: 'app-course-registration',
  standalone: false,
  templateUrl: './course-registration.component.html',
  styleUrls: ['./course-registration.component.css']
})
export class CourseRegistrationComponent implements OnInit { 

  courses: any[] = [];
  filteredCourses: any[] = [];
  videoFile: File | null = null;

  availableUsers: User[] = [];

  searchTerm = '';

  totalCourses = 0;
  coursesWithAssignments = 0;
  totalUsersWatched = 0;
  totalUsersRemaining = 0;

  showModal = false;
  isEdit = false;

  isLoading = false;

  courseData: CourseCreation & { id?: number } = {
    id: 0,
    title: '',
    description: '',
    videoUrl: '',
    creatorId: 0,
    assignedUserIds: []
  };

  constructor(
    private courseService: CourseService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getUserInfo();
    this.courseData.creatorId = user?.id ?? 0;

    this.loadUsers();
    this.loadCourses();
  }

  loadUsers() {
    this.userService.getUser().subscribe({
      next: users => this.availableUsers = users.filter(u => u.isActive),
      error: err => console.error(err)
    });
  }

  loadCourses() {
    this.courseService.getCreatedAndAssignedCourses().subscribe({
      next: courses => {
        // Primeiro armazena os cursos
        this.courses = courses;

        // Agora busca o tracking de cada curso
        const trackingRequests = this.courses.map(course =>
          this.courseService.getCourseTracking(course.id).pipe(
            map(tracking => ({ ...course, tracking }))
          )
        );

        forkJoin(trackingRequests).subscribe({
          next: coursesWithTracking => {
            this.courses = coursesWithTracking;
            this.applyFilters();
            this.updateStats();
          },
          error: err => console.error(err)
        });
      },
      error: err => console.error(err)
    });
  }

  updateStats() {
    this.totalCourses = this.courses.length;
    this.coursesWithAssignments = this.courses.filter(c => c.assignedUserIds.length > 0).length;

    let watchedCount = 0;
    let remainingCount = 0;

    this.courses.forEach(course => {
      if (course.tracking && Array.isArray(course.tracking)) {
        course.tracking.forEach((t: CourseTracking) => {
          if (t.isWatched) watchedCount++;
          else remainingCount++;
        });
      }
    });

    this.totalUsersWatched = watchedCount;
    this.totalUsersRemaining = remainingCount;
  }


  applyFilters() {
    const term = this.searchTerm.toLowerCase();
    this.filteredCourses = this.courses.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term)
    );
  }

  openModal() {
    this.resetForm();
    this.isEdit = false;
    this.showModal = true;
  }

  editCourse(course: any) {
    this.isEdit = true;
    this.courseData = { ...course };
    this.showModal = true;
  }

  resetForm() {
    this.courseData = {
      id: 0,
      title: '',
      description: '',
      videoUrl: '',
      creatorId: this.courseData.creatorId,
      assignedUserIds: []
    };

    this.videoFile = null;
  }

  closeModal() {
    this.showModal = false;
  }

  saveCourse() {
    this.isLoading = true;

    const formData = new FormData();
    formData.append("title", this.courseData.title);
    formData.append("description", this.courseData.description);
    formData.append("creatorId", this.courseData.creatorId.toString());

    this.courseData.assignedUserIds.forEach(id =>
      formData.append("assignedUserIds", id.toString())
    );

    if (this.videoFile) {
      formData.append("file", this.videoFile);
    }

    if (this.isEdit) {
      this.courseService.update(this.courseData.id!, formData).subscribe({
        next: () => {
          this.isLoading = false;
          this.closeModal();
          this.loadCourses();
          this.toastr.success('Curso atualizado com sucesso!', 'Sucesso');
        },
        error: err => {
          this.isLoading = false;
          console.error(err);
          this.toastr.error('Erro ao atualizar o curso.', 'Erro');
        }
      });

    } else {
      this.courseService.createCourse(formData).subscribe({
        next: () => {
          this.isLoading = false;
          this.closeModal();
          this.loadCourses();
          this.toastr.success('Curso criado com sucesso!', 'Sucesso');
        },
        error: err => {
          this.isLoading = false;
          console.error(err);
          this.toastr.error('Erro ao criar o curso.', 'Erro');
        }
      });
    }
  }

  deleteCourse(id: number) {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Você não poderá reverter isso!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.courseService.delete(id).subscribe({
          next: () => {
            this.loadCourses();
            this.toastr.success('Curso excluído com sucesso!', 'Sucesso');
          },
          error: err => {
            console.error(err);
            this.toastr.error('Erro ao excluir o curso.', 'Erro');
          }
        });
      }
    });
  }

  goToTracking(courseId: number) {
    this.router.navigate(['/admin/courses-tracking', courseId]);
  }


  onVideoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.videoFile = file;
    }
  }

}
