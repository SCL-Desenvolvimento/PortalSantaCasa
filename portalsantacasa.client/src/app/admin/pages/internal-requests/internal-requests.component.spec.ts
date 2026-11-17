import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentTestModule } from '../../../../testing/component-test.module';
import { environment } from '../../../../environments/environment';
import { InternalRequestsComponent } from './internal-requests.component';

describe('InternalRequestsComponent', () => {
  const api = `${environment.apiUrl}/internalrequests`;
  const service = { code: 'segunda-via-cracha', name: 'Segunda via de crachá', department: 'Departamento Pessoal' };
  const request = {
    id: 12, protocol: 'SOL-000012', serviceName: service.name, department: service.department,
    requesterName: 'Colaborador', status: 'recebida', dueDate: null, createdAt: '2026-11-16T18:00:00Z', version: 1
  };
  const detail = { request, history: [] };
  let fixture: ComponentFixture<InternalRequestsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ComponentTestModule, InternalRequestsComponent] }).compileComponents();
    fixture = TestBed.createComponent(InternalRequestsComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('reuses the operation ID after an uncertain submission and shows its returned protocol', () => {
    http.expectOne(`${api}/catalog`).flush({ canManage: false, services: [service] });
    http.expectOne(`${api}/mine?page=1`).flush({ items: [], hasMore: false });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.request-open') as HTMLButtonElement;

    button.click();
    const first = http.expectOne(`${api}`);
    first.flush({}, { status: 500, statusText: 'Uncertain' });
    fixture.detectChanges();
    button.click();
    const retry = http.expectOne(`${api}`);
    expect(retry.request.body.operationId).toBe(first.request.body.operationId);
    retry.flush(detail);
    http.expectOne(`${api}/mine?page=1`).flush({ items: [request], hasMore: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('SOL-000012');
    expect(fixture.nativeElement.textContent).not.toContain('Fila do setor');
    http.verify();
  });

  it('opens the authorized queue and blocks saving again after a stale version until reloaded', () => {
    http.expectOne(`${api}/catalog`).flush({ canManage: true, services: [service] });
    http.expectOne(`${api}/mine?page=1`).flush({ items: [], hasMore: false });

    fixture.componentInstance.changeView('queue');
    http.expectOne(`${api}/queue?page=1`).flush({ items: [request], hasMore: false });
    fixture.componentInstance.openDetail(request.id);
    http.expectOne(`${api}/${request.id}`).flush(detail);
    fixture.componentInstance.nextStatus = 'em-andamento';
    fixture.componentInstance.save();
    const update = http.expectOne(`${api}/${request.id}`);
    expect(update.request.body.version).toBe(1);
    update.flush({ detail: 'Recarregue os dados antes de salvar.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Recarregue os dados antes de salvar.');
    http.verify();
  });
});
