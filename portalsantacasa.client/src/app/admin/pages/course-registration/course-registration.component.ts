import { Component, OnInit } from '@angular/core';
import { CourseService } from '../../../core/services/course.service';
import { User } from '../../../models/user.model';
import { CourseCreation } from '../../../models/course-creation.model';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-course-registration',
  standalone: false,
  templateUrl: './course-registration.component.html',
  styleUrls: ['./course-registration.component.css']
})
export class CourseRegistrationComponent implements OnInit {
  course: CourseCreation = {
    title: '',
    description: '',
    videoUrl: '',
    creatorId: 0,
    assignedUserIds: []
  };
  availableUsers: User[] = [];
  selectedUsers: number[] = [];
  isLoading: boolean = false;
  message: string = '';

  constructor(private courseService: CourseService,
    private userService: UserService,
    private authService: AuthService
) { }

  ngOnInit(): void {
    const user = this.authService.getUserInfo();
    this.course.creatorId = user?.id ?? 0;

    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUser().subscribe({
      next: (users) => {
        this.availableUsers = users;
      },
      error: (err) => {
        this.message = 'Erro ao carregar usuários.';
        console.error(err);
      }
    });
  }

  toggleUserAssignment(userId: number | undefined): void {
    if (!userId) return;

    const index = this.selectedUsers.indexOf(userId);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(userId);
    }
  }

  registerCourse(): void {
    this.isLoading = true;
    this.course.assignedUserIds = this.selectedUsers;
    this.message = 'Cadastrando curso...';

    this.courseService.createCourse(this.course).subscribe({
      next: () => {
        this.isLoading = false;
        this.message = 'Curso cadastrado e atribuído com sucesso!';
        this.resetForm();
      },
      error: (err) => {
        this.isLoading = false;
        this.message = 'Erro ao cadastrar o curso.';
        console.error(err);
      }
    });
  }

resetForm(): void {
  const user = this.authService.getUserInfo();

  this.course = {
    title: '',
    description: '',
    videoUrl: '',
    creatorId: user?.id ?? 0,
    assignedUserIds: []
  };

  this.selectedUsers = [];
}

}
