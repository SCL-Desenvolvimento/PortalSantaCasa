import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CourseCreation } from '../../models/course-creation.model';
import { CourseView } from '../../models/course-view.model';
import { MarkAsWatched } from '../../models/mark-as-watched.model';
import { CourseTracking } from '../../models/course-tracking.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = `${environment.apiUrl}/courses`

  constructor(private http: HttpClient) { }

  // Cadastro de Curso
  createCourse(course: CourseCreation): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, course);
  }

  // Obter cursos atribuídos a um usuário
  getAssignedCourses(userId: number): Observable<CourseView[]> {
    return this.http.get<CourseView[]>(`${this.apiUrl}/assigned/${userId}`);
  }

  // Marcar curso como assistido
  markAsWatched(data: MarkAsWatched): Observable<any> {
    return this.http.post(`${this.apiUrl}/watch`, data);
  }

  // Rastreamento de visualização de um curso (para o admin)
  getCourseTracking(courseId: number): Observable<CourseTracking[]> {
    return this.http.get<CourseTracking[]>(`${this.apiUrl}/tracking/${courseId}`);
  }
}
