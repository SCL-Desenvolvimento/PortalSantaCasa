import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentTestModule],
      declarations: [HomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
    spyOn(window, 'requestAnimationFrame').and.returnValue(42);
    const cancel = spyOn(window, 'cancelAnimationFrame');
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
    const frame = spyOn(window, 'requestAnimationFrame');
    component.ngOnDestroy();
    component.banners = [banner(1, 2)];
    component.startCarousel();
    expect(frame).not.toHaveBeenCalled();
  });
});
