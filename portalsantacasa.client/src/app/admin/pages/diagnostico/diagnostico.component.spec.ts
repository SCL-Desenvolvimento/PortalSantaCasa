import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CID10Component } from './diagnostico.component';

describe('CID10Component', () => {
  let component: CID10Component;
  let fixture: ComponentFixture<CID10Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CID10Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CID10Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
