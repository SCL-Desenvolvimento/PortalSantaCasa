import { of, Subject, throwError } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { PublicAccessLogModalComponent } from './public-access-log-modal.component';
import { PublicAccessLogService } from '../../../core/services/public-access-log.service';
import { PointsService } from '../../../core/services/points.service';

describe('PublicAccessLogModalComponent RH lookup', () => {
  let component: PublicAccessLogModalComponent;
  let service: jasmine.SpyObj<PublicAccessLogService>;
  let points: jasmine.SpyObj<PointsService>;
  beforeEach(() => {
    service = jasmine.createSpyObj('PublicAccessLogService', ['getEmployee', 'create']);
    points = jasmine.createSpyObj('PointsService', ['saveIdentity']);
    component = new PublicAccessLogModalComponent(service, points);
    component.page = 'noticias';
    component.form.re = '05520';
  });

  it('preserves leading zeros and accepts the RH sector', () => {
    service.getEmployee.and.returnValue(of({ re: '05520', name: 'Pessoa', sector: 'SETOR RH' }));
    component.lookupEmployee();
    expect(service.getEmployee).toHaveBeenCalledWith('05520');
    expect(component.form.sector).toBe('SETOR RH');
    expect(component.employeeFound).toBeTrue();
  });

  it('cancels stale responses when the chapa changes', () => {
    const response = new Subject<{ re: string; name: string; sector: string }>();
    service.getEmployee.and.returnValue(response);
    component.lookupEmployee();
    component.form.re = '09999';
    component.onChapaChange();
    response.next({ re: '05520', name: 'Pessoa', sector: 'TI' });
    expect(component.form.name).toBe('');
    expect(component.form.re).toBe('09999');
    component.submit();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('clears identity and blocks submission after a lookup error', () => {
    service.getEmployee.and.returnValue(throwError(() => new Error('Chapa não encontrada no RH.')));
    component.form.name = 'Antigo';
    component.form.sector = 'TI';
    component.lookupEmployee();
    expect(component.form.name).toBe('');
    expect(component.errorMessage).toContain('não encontrada');
    component.submit();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects an incomplete response', () => {
    service.getEmployee.and.returnValue(of({ re: '05520', name: '', sector: 'TI' }));
    component.lookupEmployee();
    expect(component.employeeFound).toBeFalse();
    expect(component.isLookingUp).toBeFalse();
    expect(component.errorMessage).toContain('dados inválidos');
    expect(component.manualEntry).toBeTrue();
  });

  it('ends a stalled lookup and allows retry on blur', fakeAsync(() => {
    service.getEmployee.and.returnValue(new Subject());
    component.lookupEmployee();
    tick(35000);
    expect(component.isLookingUp).toBeFalse();
    expect(component.employeeFound).toBeFalse();
    expect(component.errorMessage).toContain('demorou');
    expect(component.manualEntry).toBeTrue();
    service.getEmployee.and.returnValue(of({ re: '05520', name: 'Pessoa', sector: 'TI' }));
    component.onChapaChange();
    component.lookupEmployee();
    expect(component.employeeFound).toBeTrue();
    expect(component.errorMessage).toBe('');
  }));

  it('allows manual registration on RH unavailability', () => {
    service.getEmployee.and.returnValue(throwError(() => Object.assign(new Error('RH indisponível'), { status: 503 })));
    component.lookupEmployee();
    expect(component.manualEntry).toBeTrue();
    component.form.name = 'Pessoa';
    component.form.sector = 'TI';
    service.create.and.returnValue(of({ id: 1, re: '05520', name: 'Pessoa', sector: 'TI', page: 'noticias', accessedAt: '' }));
    component.submit();
    expect(service.create).toHaveBeenCalled();
    expect(points.saveIdentity).toHaveBeenCalledWith({ re: '05520', name: 'Pessoa', sector: 'TI' });
  });
});
