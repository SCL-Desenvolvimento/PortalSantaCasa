import { beforeEach, describe, expect, vi } from "vitest";
import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(async () => {
        vi.restoreAllMocks();
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [HomeComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('links each carousel card to its specific news item', () => {
        component.latestNews = [{
                id: 42,
                title: 'Notícia específica',
                summary: 'Resumo',
                content: '',
                imageUrl: '/image.jpg',
                isActive: true,
                isQualityMinute: false,
                createdAt: new Date().toISOString(),
                category: 'Notícia'
            }];
        fixture.detectChanges();

        const readMore = fixture.debugElement.query(By.css('.news-read-more'));
        expect(readMore.injector.get(RouterLink).urlTree?.toString()).toBe('/noticia/42');
    });

    const banner = (id: number, timeSeconds: number) => ({
        id, timeSeconds, title: 'Banner', description: '', imageUrl: '',
        order: id, isActive: true, newsId: 0
    });

    it('uses a safe duration for invalid banner data', () => {
        for (const duration of [0, -1, NaN, Infinity]) {
            component.banners = [banner(1, duration)];
            expect(component.getCurrentSlideDuration()).toBe(5000);
        }
    });

    it('pauses hidden banners and resumes them when returning to the home section', fakeAsync(() => {
        vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
        const cancel = vi.spyOn(window, 'cancelAnimationFrame');
        component.banners = [banner(1, 2), banner(2, 2)];
        component.startCarousel();
        component.showMenu();
        expect(cancel).toHaveBeenCalledWith(42);
        tick(3000);
        expect(component.currentSlide).toBe(0);
        component.resetSelection();
        tick(2000);
        expect(component.currentSlide).toBe(1);
        component.ngOnDestroy();
    }));

    it('does not restart the carousel when data arrives after the component is destroyed', () => {
        const frame = vi.spyOn(window, 'requestAnimationFrame');
        component.ngOnDestroy();
        component.banners = [banner(1, 2)];
        component.startCarousel();
        expect(frame).not.toHaveBeenCalled();
    });
});
