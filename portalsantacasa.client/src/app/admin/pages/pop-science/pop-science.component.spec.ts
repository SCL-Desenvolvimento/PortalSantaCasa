import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PopScienceComponent } from './pop-science.component';

describe('PopScienceComponent', () => {
  it('opens the latest text from its permanent link and confirms only the version explicitly selected and read', async () => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      provideRouter([{ path: 'admin/pops', component: PopScienceComponent }])
    ] });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/admin/pops?documento=17');
    const api = `${environment.apiUrl}/pop-science`;
    const base = { owner: 'Qualidade', releaseNote: 'Revisão anual', reviewDate: '2099-02-01',
      acknowledgementDeadline: '2099-01-02', publishedAt: '2099-01-01T12:00:00Z', publishedByName: 'Qualidade',
      fileName: null, assigned: true, confirmedAt: null };
    http.expectOne(api).flush({ publisherDepartments: [], items: [{ id: 17, title: 'Orientações', kind: 'comunicado',
      department: 'Compras', canManage: false, canTrack: false, versions: [
        { ...base, number: 2, body: 'Texto mais recente' }, { ...base, number: 1, body: 'Texto original' }
      ] }] });
    harness.detectChanges();
    const host = harness.routeNativeElement!;
    expect(host.textContent).toContain('Texto mais recente');
    expect(host.textContent).not.toContain('Baixar PDF');

    const button = (label: string) => [...host.querySelectorAll('button')].find(el => el.textContent?.includes(label))!;
    const initialConfirm = button('Confirmar ciência da versão 2');
    expect(initialConfirm.disabled).toBe(true);
    const checkbox = () => host.querySelector<HTMLInputElement>('.science-box input[type="checkbox"]')!;
    checkbox().click();
    harness.detectChanges();
    expect(initialConfirm.disabled).toBe(false);
    button('Versão 1 ·').click();
    harness.detectChanges();
    expect(host.textContent).toContain('Texto original');
    const explicitConfirm = button('Confirmar ciência da versão 1');
    expect(explicitConfirm.disabled).toBe(true);
    http.expectNone(`${api}/17/versions/2/confirm`);

    checkbox().click();
    harness.detectChanges();
    explicitConfirm.click();
    const request = http.expectOne(`${api}/17/versions/1/confirm`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ confirmedAt: '2099-01-01T13:00:00Z' });
    harness.detectChanges();
    expect(host.textContent).toContain('Ciência registrada em 01/01/2099');
    http.verify();
  });
});
