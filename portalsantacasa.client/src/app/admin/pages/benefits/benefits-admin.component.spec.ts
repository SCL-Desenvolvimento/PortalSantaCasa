import { beforeEach, describe, expect, it, type MockedObject, vi } from "vitest";
import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BenefitService } from '../../../core/services/benefit.service';
import { Benefit } from '../../../models/benefit.model';
import { BenefitsAdminComponent } from './benefits-admin.component';

describe('BenefitsAdminComponent', () => {
    let component: BenefitsAdminComponent;
    let service: MockedObject<BenefitService>;
    let toastr: MockedObject<ToastrService>;
    const benefit: Benefit = { id: 1, title: 'Saúde', description: 'Plano', category: 'Assistência',
        eligibility: 'Colaboradores', howToAccess: 'RH', link: null, isActive: true };
    const validForm = () => ({ invalid: false, control: { markAllAsTouched: vi.fn() } }) as unknown as NgForm;

    beforeEach(() => {
        service = {
            getAdmin: vi.fn().mockName("BenefitService.getAdmin"),
            create: vi.fn().mockName("BenefitService.create"),
            update: vi.fn().mockName("BenefitService.update"),
            delete: vi.fn().mockName("BenefitService.delete")
        } as unknown as MockedObject<BenefitService>;
        toastr = {
            error: vi.fn().mockName("ToastrService.error"),
            success: vi.fn().mockName("ToastrService.success")
        } as unknown as MockedObject<ToastrService>;
        service.getAdmin.mockReturnValue(of([{ ...benefit }]));
        component = new BenefitsAdminComponent(service, toastr);
    });
    it('opens the creation modal with empty fields and closes on Escape', () => {
        component.edit();
        expect(component.showForm).toBe(true);
        expect(component.editingId).toBeNull();
        expect(component.data.title).toBe('');
        component.onDialogKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(component.showForm).toBe(false);
    });
    it('renders the modal when the new benefit button is clicked', async () => {
        await TestBed.configureTestingModule({ imports: [BenefitsAdminComponent], providers: [
                { provide: BenefitService, useValue: service }, { provide: ToastrService, useValue: toastr }
            ] }).compileComponents();
        const fixture = TestBed.createComponent(BenefitsAdminComponent);
        fixture.detectChanges();
        const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find(item => item.textContent?.includes('Novo benefício'))!;
        expect(button).toBeDefined();
        button.click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Ver página pública');
    });
    it('edits a copy without changing the card before saving', () => {
        component.edit(benefit);
        component.data.title = 'Changed';
        expect(benefit.title).toBe('Saúde');
        expect(component.editingId).toBe(1);
    });
    it('filters by publication and search', () => {
        component.benefits = [benefit, { ...benefit, id: 2, isActive: false }];
        component.statusFilter = 'inactive';
        component.search = ' assistência ';
        expect(component.filtered.map(item => item.id)).toEqual([2]);
        expect(component.activeCount).toBe(1);
    });
    it('blocks dangerous links without making a save request', () => {
        component.data = { ...benefit, link: 'javascript:alert(1)' };
        component.save(validForm());
        expect(service.create).not.toHaveBeenCalled();
        expect(toastr.error).toHaveBeenCalled();
    });
    it('prevents duplicate saves and leaves the modal open after a failed request', () => {
        const response = new Subject<Benefit>();
        service.create.mockReturnValue(response);
        component.edit();
        component.data = { ...benefit };
        component.save(validForm());
        component.save(validForm());
        expect(service.create).toHaveBeenCalledTimes(1);
        expect(component.saving).toBe(true);
        response.error(new Error('failure'));
        expect(component.saving).toBe(false);
        expect(component.showForm).toBe(true);
    });
    it('does not change publication locally if the API rejects the request', () => {
        service.update.mockReturnValue(throwError(() => new Error('failure')));
        const item = { ...benefit };
        component.togglePublication(item);
        expect(item.isActive).toBe(true);
        expect(component.publishingId).toBeNull();
    });
    it('updates publication after success', () => {
        service.update.mockReturnValue(of({ ...benefit, isActive: false }));
        const item = { ...benefit };
        component.togglePublication(item);
        expect(item.isActive).toBe(false);
        expect(toastr.success).toHaveBeenCalled();
    });
});
