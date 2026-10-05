import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentTestModule } from '../../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsComponent } from './news.component';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

describe('NewsComponent', () => {
    let component: NewsComponent;
    let fixture: ComponentFixture<NewsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [NewsComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(NewsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('NewsComponent visibility by role', () => {
    for (const quality of [false, true]) {
        for (const role of ['superadmin', 'SuperAdmin', 'admin', 'editor']) {
            it(`keeps the content type filter and applies department scope for ${role}, quality=${quality}`, () => {
                const items = [
                    { id: 1, department: 'TI', isQualityMinute: quality },
                    { id: 2, department: 'Enfermagem', isQualityMinute: quality },
                    { id: 3, department: 'Enfermagem', isQualityMinute: !quality }
                ].map(item => ({ ...item, title: 'Conteúdo', summary: '', imageUrl: '', isActive: true }));
                const service = {
                    getNews: vi.fn().mockName("NewsService.getNews"),
                    getNewsTotals: vi.fn().mockName("NewsService.getNewsTotals")
                };
                service.getNews.mockReturnValue(of(items));
                service.getNewsTotals.mockReturnValue(of({ totalNews: 2, activeNews: 2, inactiveNews: 0 }));
                const auth = {
                    getUserInfo: vi.fn().mockName("AuthService.getUserInfo")
                };
                auth.getUserInfo.mockImplementation((field: string) => field === 'role' ? role : 'TI');
                const route = { queryParams: of({ quality: String(quality) }) } as unknown as ActivatedRoute;
                const subject = new NewsComponent(service as any, {
                    error: vi.fn().mockName("ToastrService.error")
                } as any, auth as any, route);

                subject.ngOnInit();

                expect(subject.filteredNews.map(item => item.id))
                    .toEqual(role.toLowerCase() === 'superadmin' ? [1, 2] : [1]);
            });
        }
    }
});
