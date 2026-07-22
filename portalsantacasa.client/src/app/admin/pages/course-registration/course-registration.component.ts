import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map, of } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { CourseService } from '../../../core/services/course.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/user.model';
import { CourseContentType, CourseCreation, CourseTracking, CourseView } from '../../../models/course.model';

@Component({
  selector: 'app-course-registration',
  standalone: false,
  templateUrl: './course-registration.component.html',
  styleUrls: ['./course-registration.component.css']
})
export class CourseRegistrationComponent implements OnInit {
  courses: Array<CourseView & { tracking?: CourseTracking[] }> = [];
  filteredCourses: Array<CourseView & { tracking?: CourseTracking[] }> = [];
  contentFile: File | null = null;
  availableUsers: User[] = [];
  departments: string[] = [];
  searchTerm = '';
  contentFilter: 'all' | CourseContentType = 'all';
  totalCourses = 0;
  coursesWithAssignments = 0;
  totalUsersWatched = 0;
  totalUsersRemaining = 0;
  showModal = false;
  isEdit = false;
  isLoading = false;
  private originalContentType: CourseContentType = 'video';

  courseData: CourseCreation & { id?: number } = this.emptyCourse(0);

  constructor(
    private courseService: CourseService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.courseData.creatorId = this.authService.getUserInfo()?.id ?? 0;
    this.loadUsers();
    this.loadCourses();
  }

  loadUsers(): void {
    this.userService.getUser().subscribe({
      next: users => {
        this.availableUsers = users
          .filter(user => user.isActive && !!user.id)
          .sort((a, b) => a.username.localeCompare(b.username));
        this.departments = [...new Set(this.availableUsers.map(user => user.department).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b));
      },
      error: () => this.toastr.error('Não foi possível carregar usuários e setores.', 'Erro')
    });
  }

  loadCourses(): void {
    this.courseService.getCreatedAndAssignedCourses().subscribe({
      next: courses => {
        const requests = courses.map(course =>
          this.courseService.getCourseTracking(course.id).pipe(map(tracking => ({ ...course, tracking })))
        );
        (requests.length ? forkJoin(requests) : of([])).subscribe({
          next: result => {
            this.courses = result;
            this.applyFilters();
            this.updateStats();
          },
          error: () => this.toastr.error('Não foi possível carregar o acompanhamento.', 'Erro')
        });
      },
      error: () => this.toastr.error('Não foi possível carregar os cursos.', 'Erro')
    });
  }

  updateStats(): void {
    this.totalCourses = this.courses.length;
    this.coursesWithAssignments = this.courses.filter(course => course.assignedUserIds?.length).length;
    const tracking = this.courses.flatMap(course => course.tracking || []);
    this.totalUsersWatched = tracking.filter(item => item.isWatched).length;
    this.totalUsersRemaining = tracking.filter(item => !item.isWatched).length;
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    this.filteredCourses = this.courses.filter(course => {
      const matchesText = !term || course.title.toLocaleLowerCase().includes(term) ||
        course.description.toLocaleLowerCase().includes(term);
      return matchesText && (this.contentFilter === 'all' || course.contentType === this.contentFilter);
    });
  }

  setContentFilter(filter: 'all' | CourseContentType): void {
    this.contentFilter = filter;
    this.applyFilters();
  }

  openModal(): void {
    this.isEdit = false;
    this.courseData = this.emptyCourse(this.courseData.creatorId);
    this.contentFile = null;
    this.originalContentType = 'video';
    this.showModal = true;
  }

  editCourse(course: CourseView): void {
    this.isEdit = true;
    this.contentFile = null;
    this.originalContentType = course.contentType || 'video';
    const assignedDepartments = [...(course.assignedDepartments || [])];
    const departmentUserIds = new Set(this.availableUsers
      .filter(user => assignedDepartments.includes(user.department))
      .map(user => user.id));
    this.courseData = {
      id: course.id,
      title: course.title,
      description: course.description,
      videoUrl: course.videoUrl,
      contentType: course.contentType || 'video',
      creatorId: Number(course.creatorId),
      assignedUserIds: (course.assignedUserIds || []).filter(id => !departmentUserIds.has(id)),
      assignedDepartments
    };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  saveCourse(): void {
    if (this.requiresContentFile && !this.contentFile) {
      this.toastr.warning('Selecione um vídeo ou PDF.', 'Conteúdo obrigatório');
      return;
    }

    this.isLoading = true;
    const formData = new FormData();
    formData.append('title', this.courseData.title.trim());
    formData.append('description', this.courseData.description.trim());
    formData.append('creatorId', this.courseData.creatorId.toString());
    formData.append('contentType', this.courseData.contentType);
    this.courseData.assignedUserIds.forEach(id => formData.append('assignedUserIds', id.toString()));
    this.courseData.assignedDepartments.forEach(department => formData.append('assignedDepartments', department));
    if (this.contentFile) formData.append('file', this.contentFile);

    const request = this.isEdit
      ? this.courseService.update(this.courseData.id!, formData)
      : this.courseService.createCourse(formData);
    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
        this.loadCourses();
        this.toastr.success(`Curso ${this.isEdit ? 'atualizado' : 'criado'} com sucesso!`, 'Sucesso');
      },
      error: error => {
        this.isLoading = false;
        this.toastr.error(error?.error?.error || 'Não foi possível salvar o curso.', 'Erro');
      }
    });
  }

  deleteCourse(id: number): void {
    Swal.fire({
      title: 'Excluir este curso?',
      text: 'O conteúdo e todo o histórico de acompanhamento serão removidos.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#dc2626', cancelButtonColor: '#64748b',
      confirmButtonText: 'Excluir', cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.courseService.delete(id).subscribe({
        next: () => { this.loadCourses(); this.toastr.success('Curso excluído.', 'Sucesso'); },
        error: () => this.toastr.error('Não foi possível excluir o curso.', 'Erro')
      });
    });
  }

  goToTracking(courseId: number): void {
    this.router.navigate(['/admin/courses-tracking', courseId]);
  }

  onContentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isVideo = file.type.startsWith('video/');
    if ((this.courseData.contentType === 'pdf' && !isPdf) || (this.courseData.contentType === 'video' && !isVideo)) {
      input.value = '';
      this.contentFile = null;
      this.toastr.warning(`Selecione um arquivo ${this.courseData.contentType === 'pdf' ? 'PDF' : 'de vídeo'}.`);
      return;
    }
    this.contentFile = file;
  }

  changeContentType(type: CourseContentType): void {
    if (this.courseData.contentType !== type) this.contentFile = null;
    this.courseData.contentType = type;
  }

  selectAllUsers(): void {
    this.courseData.assignedUserIds = this.availableUsers.map(user => user.id!).filter(Boolean);
  }

  clearAssignments(): void {
    this.courseData.assignedUserIds = [];
    this.courseData.assignedDepartments = [];
  }

  get assignedPeopleCount(): number {
    const ids = new Set(this.courseData.assignedUserIds);
    this.availableUsers
      .filter(user => this.courseData.assignedDepartments.includes(user.department))
      .forEach(user => ids.add(user.id!));
    return ids.size;
  }

  get requiresContentFile(): boolean {
    return !this.isEdit || this.courseData.contentType !== this.originalContentType;
  }

  private emptyCourse(creatorId: number): CourseCreation & { id?: number } {
    return { id: 0, title: '', description: '', videoUrl: '', contentType: 'video', creatorId,
      assignedUserIds: [], assignedDepartments: [] };
  }
}
