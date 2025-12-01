import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { CourseTracking } from '../../models/course.model';
import { CourseView } from '../../models/course.model';
import { MarkAsWatched } from '../../models/mark-as-watched.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) { }

  createCourse(course: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, course);
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  update(id: number, course: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${id}`, course);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`);
  }

  getAssignedCourses(userId: number): Observable<CourseView[]> {
    return this.http.get<CourseView[]>(`${this.apiUrl}/assigned/${userId}`).pipe(
      map(courses =>
        courses
          .map(course => ({
            ...course,
            videoUrl: `${environment.serverUrl}${course.videoUrl}`
          })))
    );
  }

  markAsWatched(data: MarkAsWatched): Observable<any> {
    return this.http.post(`${this.apiUrl}/watch`, data);
  }

  getCourseTracking(courseId: number): Observable<CourseTracking[]> {
    return this.http.get<CourseTracking[]>(`${this.apiUrl}/tracking/${courseId}`);
  }

  getCreatedAndAssignedCourses(): Observable<CourseView[]> {
    return this.http.get<CourseView[]>(`${this.apiUrl}/created-and-assigned`).pipe(
      map(courses =>
        courses
          .map(course => ({
            ...course,
            videoUrl: `${environment.serverUrl}${course.videoUrl}`
          })))
    );
  }
}
