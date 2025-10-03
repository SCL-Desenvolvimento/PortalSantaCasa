import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalAnnouncementDetailComponent } from './internal-announcement-detail.component';

describe('InternalAnnouncementDetailComponent', () => {
  let component: InternalAnnouncementDetailComponent;
  let fixture: ComponentFixture<InternalAnnouncementDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InternalAnnouncementDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InternalAnnouncementDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
