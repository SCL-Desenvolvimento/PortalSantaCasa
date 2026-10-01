import { ComponentTestModule } from '../../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsRegisterComponent } from './forms-register.component';

describe('FormsRegisterComponent', () => {
  let component: FormsRegisterComponent;
  let fixture: ComponentFixture<FormsRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentTestModule],
      declarations: [FormsRegisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormsRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
