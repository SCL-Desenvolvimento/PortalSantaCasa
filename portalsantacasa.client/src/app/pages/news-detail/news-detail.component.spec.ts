import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicAccessLogModalComponent } from '../../shared/components/public-access-log-modal/public-access-log-modal.component';
import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsDetailComponent } from './news-detail.component';

describe('NewsDetailComponent', () => {
    let component: NewsDetailComponent;
    let fixture: ComponentFixture<NewsDetailComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [NewsDetailComponent, PublicAccessLogModalComponent]
        })
            .compileComponents();

        vi.spyOn(NewsDetailComponent.prototype, 'ngOnInit').mockImplementation(() => {
        });
        fixture = TestBed.createComponent(NewsDetailComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    for (const position of ['top', 'bottom'] as const) {
        it(`renders a responsive video in the ${position} position`, () => {
            component.isLoading = false;
            component.hasError = false;
            component.news = {
                title: 'Notícia com vídeo', summary: 'Resumo', content: '<p>Conteúdo</p>',
                imageUrl: '/banner.jpg', videoUrl: '/video.mp4', videoPosition: position,
                isActive: true, isQualityMinute: false, createdAt: new Date().toISOString(), category: 'Notícia'
            };
            fixture.detectChanges();

            const video = fixture.nativeElement.querySelector(`.article-video-${position} video`) as HTMLVideoElement;
            expect(video).toBeTruthy();
            expect(video.getAttribute('controls')).not.toBeNull();
            expect(video.getAttribute('playsinline')).not.toBeNull();
            const gridChildren = [...fixture.nativeElement.querySelector('.article-layout-grid').children] as HTMLElement[];
            const videoIndex = gridChildren.findIndex(element => element.classList.contains(`article-video-${position}`));
            const contentIndex = gridChildren.findIndex(element => element.classList.contains('article-content'));
            expect(position === 'top' ? videoIndex < contentIndex : videoIndex > contentIndex).toBe(true);
        });
    }
});
