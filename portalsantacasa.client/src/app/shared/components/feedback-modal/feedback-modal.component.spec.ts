import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackModalComponentComponent } from './feedback-modal.component';

describe('FeedbackModalComponentComponent', () => {
  let component: FeedbackModalComponentComponent;
  let fixture: ComponentFixture<FeedbackModalComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FeedbackModalComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackModalComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
