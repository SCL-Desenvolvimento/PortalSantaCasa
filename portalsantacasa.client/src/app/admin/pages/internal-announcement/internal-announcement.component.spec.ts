import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalAnnouncementComponent } from './internal-announcement.component';

describe('InternalAnnouncementComponent', () => {
  let component: InternalAnnouncementComponent;
  let fixture: ComponentFixture<InternalAnnouncementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InternalAnnouncementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InternalAnnouncementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
