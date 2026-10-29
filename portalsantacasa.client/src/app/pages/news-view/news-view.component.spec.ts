import { beforeEach, describe, expect, it } from "vitest";
import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

import { NewsViewComponent } from './news-view.component';

describe('NewsViewComponent', () => {
    let component: NewsViewComponent;
    let fixture: ComponentFixture<NewsViewComponent>;
    let http: HttpTestingController;
    let queryParams: BehaviorSubject<Record<string, string>>;
    const base = `${environment.apiUrl}/news/paginated`;

    beforeEach(async () => {
        queryParams = new BehaviorSubject<Record<string, string>>({});
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [NewsViewComponent],
            providers: [{ provide: ActivatedRoute, useValue: { queryParams } }]
        })
            .compileComponents();

        fixture = TestBed.createComponent(NewsViewComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('starts at page one when switching from news to quality content', () => {
        http.expectOne(r => r.url === base).flush({ currentPage: 1, pages: 3, news: [] });
        component.loadNews(3);
        http.expectOne(r => r.url === base).flush({ currentPage: 3, pages: 3, news: [] });
        queryParams.next({ isQualityMinute: 'true' });
        const request = http.expectOne(r => r.url === base);
        expect(request.request.params.get('page')).toBe('1');
        request.flush({ currentPage: 1, pages: 1, news: [] });
        expect(component.currentPage).toBe(1);
        http.verify();
    });

    it('cancels stale news requests so an earlier category cannot overwrite the current one', () => {
        const previous = http.expectOne(r => r.url === base);
        queryParams.next({ isQualityMinute: 'true' });
        expect(previous.cancelled).toBe(true);
        http.expectOne(r => r.url === base).flush({ currentPage: 1, pages: 0, news: [] });
        http.verify();
    });

    it('cancels news loading when navigating away', () => {
        const request = http.expectOne(r => r.url === base);
        fixture.destroy();
        expect(request.cancelled).toBe(true);
        http.verify();
    });
});
