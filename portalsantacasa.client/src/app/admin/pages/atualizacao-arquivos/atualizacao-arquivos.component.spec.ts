import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtualizacaoArquivosComponent } from './atualizacao-arquivos.component';

describe('AtualizacaoArquivosComponent', () => {
  let component: AtualizacaoArquivosComponent;
  let fixture: ComponentFixture<AtualizacaoArquivosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AtualizacaoArquivosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtualizacaoArquivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
