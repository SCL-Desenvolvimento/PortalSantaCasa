import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/user.model';
import { CourseCreation } from '../../../models/course-creation.model';

@Component({
  selector: 'app-course-registration',
  standalone: false,
  templateUrl: './course-registration.component.html',
  styleUrls: ['./course-registration.component.css']
})
export class CourseRegistrationComponent implements OnInit {

  courses: any[] = [];
  filteredCourses: any[] = [];

  availableUsers: User[] = [];

  searchTerm = '';

  totalCourses = 0;
  coursesWithAssignments = 0;

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
    private router: Router
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
      next: data => {
        this.courses = data;
        this.applyFilters();
        this.updateStats();
      },
      error: err => console.error(err)
    });
  }

  updateStats() {
    this.totalCourses = this.courses.length;
    this.coursesWithAssignments = this.courses.filter(c => c.assignedUserIds.length > 0).length;
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
  }

  closeModal() {
    this.showModal = false;
  }

  saveCourse() {
    this.isLoading = true;

    if (this.isEdit) {
      this.courseService.update(this.courseData.id!, this.courseData).subscribe({
        next: () => {
          this.isLoading = false;
          this.closeModal();
          this.loadCourses();
        },
        error: err => {
          this.isLoading = false;
          console.error(err);
        }
      });

    } else {
      this.courseService.createCourse(this.courseData).subscribe({
        next: () => {
          this.isLoading = false;
          this.closeModal();
          this.loadCourses();
        },
        error: err => {
          this.isLoading = false;
          console.error(err);
        }
      });
    }
  }

  deleteCourse(id: number) {
    this.courseService.delete(id).subscribe({
      next: () => this.loadCourses(),
      error: err => console.error(err)
    });
  }

  goToTracking(courseId: number) {
    this.router.navigate(['/admin/courses-tracking', courseId]);
  }
}
