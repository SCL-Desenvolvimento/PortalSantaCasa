import { beforeEach, describe, expect, type MockedObject, vi } from "vitest";
import { of, Subject, throwError } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { PublicAccessLogModalComponent } from './public-access-log-modal.component';
import { PublicAccessLogService } from '../../../core/services/public-access-log.service';
import { PointsService } from '../../../core/services/points.service';

describe('PublicAccessLogModalComponent RH lookup', () => {
    let component: PublicAccessLogModalComponent;
    let service: MockedObject<PublicAccessLogService>;
    let points: MockedObject<PointsService>;
    beforeEach(() => {
        service = {
            getEmployee: vi.fn().mockName("PublicAccessLogService.getEmployee"),
            create: vi.fn().mockName("PublicAccessLogService.create")
        } as unknown as MockedObject<PublicAccessLogService>;
        points = {
            saveIdentity: vi.fn().mockName("PointsService.saveIdentity")
        } as unknown as MockedObject<PointsService>;
        component = new PublicAccessLogModalComponent(service, points);
        component.page = 'noticias';
        component.form.re = '05520';
    });

    it('preserves leading zeros and accepts the RH sector', () => {
        service.getEmployee.mockReturnValue(of({ re: '05520', name: 'Pessoa', sector: 'SETOR RH' }));
        component.lookupEmployee();
        expect(service.getEmployee).toHaveBeenCalledWith('05520');
        expect(component.form.sector).toBe('SETOR RH');
        expect(component.employeeFound).toBe(true);
    });

    it('cancels stale responses when the chapa changes', () => {
        const response = new Subject<{
            re: string;
            name: string;
            sector: string;
        }>();
        service.getEmployee.mockReturnValue(response);
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
        service.getEmployee.mockReturnValue(throwError(() => new Error('Chapa não encontrada no RH.')));
        component.form.name = 'Antigo';
        component.form.sector = 'TI';
        component.lookupEmployee();
        expect(component.form.name).toBe('');
        expect(component.errorMessage).toContain('não encontrada');
        component.submit();
        expect(service.create).not.toHaveBeenCalled();
    });

    it('rejects an incomplete response', () => {
        service.getEmployee.mockReturnValue(of({ re: '05520', name: '', sector: 'TI' }));
        component.lookupEmployee();
        expect(component.employeeFound).toBe(false);
        expect(component.isLookingUp).toBe(false);
        expect(component.errorMessage).toContain('dados inválidos');
        expect(component.manualEntry).toBe(true);
    });

    it('ends a stalled lookup and allows retry on blur', fakeAsync(() => {
        service.getEmployee.mockReturnValue(new Subject());
        component.lookupEmployee();
        tick(35000);
        expect(component.isLookingUp).toBe(false);
        expect(component.employeeFound).toBe(false);
        expect(component.errorMessage).toContain('demorou');
        expect(component.manualEntry).toBe(true);
        service.getEmployee.mockReturnValue(of({ re: '05520', name: 'Pessoa', sector: 'TI' }));
        component.onChapaChange();
        component.lookupEmployee();
        expect(component.employeeFound).toBe(true);
        expect(component.errorMessage).toBe('');
    }));

    it('allows manual registration on RH unavailability', () => {
        service.getEmployee.mockReturnValue(throwError(() => Object.assign(new Error('RH indisponível'), { status: 503 })));
        component.lookupEmployee();
        expect(component.manualEntry).toBe(true);
        component.form.name = 'Pessoa';
        component.form.sector = 'TI';
        service.create.mockReturnValue(of({ id: 1, re: '05520', name: 'Pessoa', sector: 'TI', page: 'noticias', accessedAt: '' }));
        component.submit();
        expect(service.create).toHaveBeenCalled();
        expect(points.saveIdentity).toHaveBeenCalledWith({ re: '05520', name: 'Pessoa', sector: 'TI' });
    });
});
