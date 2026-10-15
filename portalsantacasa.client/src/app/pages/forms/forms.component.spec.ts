import { beforeEach, describe, expect, it } from "vitest";
import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { FormsComponent } from './forms.component';

describe('FormsComponent', () => {
    let component: FormsComponent;
    let fixture: ComponentFixture<FormsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [FormsComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(FormsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('shows a loading status while waiting for forms', () => {
        expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent)
            .toContain('Carregando');
    });

    it('explains when no forms are published', () => {
        TestBed.inject(HttpTestingController).expectOne('https://localhost:7057/api/forms').flush([]);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Nenhum formulário disponível');
    });

    it('shows the request error instead of an empty grid', () => {
        TestBed.inject(HttpTestingController).expectOne('https://localhost:7057/api/forms')
            .flush({}, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
            .toContain('Erro ao carregar formulários.');
    });
});
