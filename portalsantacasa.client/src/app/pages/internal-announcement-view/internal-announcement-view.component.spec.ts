import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalAnnouncementViewComponent } from './internal-announcement-view.component';

describe('InternalAnnouncementViewComponent', () => {
  let component: InternalAnnouncementViewComponent;
  let fixture: ComponentFixture<InternalAnnouncementViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InternalAnnouncementViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InternalAnnouncementViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
