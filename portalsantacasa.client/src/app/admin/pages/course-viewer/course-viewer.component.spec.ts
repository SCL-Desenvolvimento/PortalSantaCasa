import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ComponentTestModule } from '../../../../testing/component-test.module';
import { AuthService } from '../../../core/services/auth.service';
import { CourseView } from '../../../models/course.model';
import { CourseViewerComponent } from './course-viewer.component';

describe('CourseViewerComponent', () => {
  it('opens the training linked by a reminder and groups the assigned onboarding contents', async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentTestModule],
      declarations: [CourseViewerComponent],
      providers: [
        { provide: AuthService, useValue: { getUserInfo: () => ({ id: 7 }) } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ course: '2' })) } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(CourseViewerComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(request => request.url.endsWith('/courses/assigned/7')).flush([
      assignedCourse(1, 'Boas-vindas', 'Integração'),
      assignedCourse(2, 'Segurança do paciente', 'integração'),
      assignedCourse(3, 'Conteúdo avulso')
    ]);
    fixture.detectChanges();

    const view = fixture.nativeElement as HTMLElement;
    expect(view.querySelector('.course-item.active strong')?.textContent).toBe('Segurança do paciente');
    expect(view.querySelectorAll('.course-group')[0].querySelectorAll('.course-item')).toHaveLength(2);
    expect(Array.from(view.querySelectorAll('.course-group h3')).map(heading => heading.textContent))
      .toEqual(['Integração', 'Outros conteúdos']);
    http.verify();
  });
});

function assignedCourse(id: number, title: string, trackName?: string): CourseView {
  const createdAt = new Date('2026-11-16T10:00:00Z');
  return {
    id, title, trackName, createdAt, description: 'Conteúdo atribuído', contentType: 'video',
    videoUrl: '/api/courses/content', contentUrl: '/api/courses/content', creatorId: 1, creatorName: 'RH',
    isWatched: false, progressPercentage: 25, lastPositionSeconds: 10, firstAccessedAt: createdAt,
    lastAccessedAt: createdAt, assignedUserIds: [7], assignedDepartments: []
  };
}
