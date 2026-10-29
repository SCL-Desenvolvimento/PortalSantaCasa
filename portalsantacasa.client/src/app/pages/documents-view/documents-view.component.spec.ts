import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Document } from '../../models/document.model';
import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsViewComponent } from './documents-view.component';

describe('DocumentsViewComponent', () => {
    let component: DocumentsViewComponent;
    let fixture: ComponentFixture<DocumentsViewComponent>;
    let http: HttpTestingController;
    const base = `${environment.apiUrl}/document/public`;
    const file = (id: number, extension = 'txt'): Document => ({
        id, name: `Documento ${id}`, fileName: `${id}.${extension}`, fileUrl: `/files/${id}.${extension}`,
        allowedRoles: [], isActive: true, createdAt: ''
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [DocumentsViewComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(DocumentsViewComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('about:blank');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        const createElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
            const element = createElement(tagName, options);
            // Unit tests inspect the preview frame, without loading a PDF or external resources.
            if (tagName.toLowerCase() === 'iframe') element.setAttribute('srcdoc', '');
            return element;
        });
        fixture.detectChanges();
    });

    afterEach(() => {
        try { http.verify({ ignoreCancelled: true }); }
        finally { TestBed.resetTestingModule(); vi.restoreAllMocks(); }
    });

    it('should create', () => {
        http.expectOne(base).flush([]);
        expect(component).toBeTruthy();
    });

    it('distinguishes loading, failure, retry and an empty document list', () => {
        expect(fixture.nativeElement.textContent).toContain('Carregando documentos');
        http.expectOne(base).flush(null, { status: 503, statusText: 'Unavailable' });
        fixture.detectChanges();
        const alert = fixture.nativeElement.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        alert.querySelector('button').click();
        http.expectOne(base).flush([]);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Nenhum documento disponível');
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('cancels the previous preview when a different document is selected', async () => {
        http.expectOne(base).flush([file(1), file(2)]);
        component.selectDocument(file(1));
        const previous = http.expectOne(`${base}/1/content`);
        component.selectDocument(file(2));
        expect(previous.cancelled).toBe(true);
        http.expectOne(`${base}/2/content`).flush(new Blob(['Atual']));
        await vi.waitFor(() => expect(component.textContent).toBe('Atual'));
        expect(component.currentDocument?.id).toBe(2);
        expect(component.textContent).toBe('Atual');
        expect(component.isLoadingDocument).toBe(false);
    });

    it('ignores a TXT conversion that finishes after selection changes', async () => {
        http.expectOne(base).flush([]);
        let finish!: (text: string) => void;
        const blob = new Blob(['Antigo']);
        vi.spyOn(blob, 'text').mockReturnValue(new Promise(resolve => finish = resolve));
        component.selectDocument(file(1));
        http.expectOne(`${base}/1/content`).flush(blob);
        expect(component.isLoadingDocument).toBe(true);
        component.selectDocument(file(2, 'pdf'));
        http.expectOne(`${base}/2/content`).flush(new Blob(['PDF'], { type: 'application/pdf' }));
        finish('Antigo');
        await fixture.whenStable();
        expect(component.textContent).toBe('');
        expect(component.safeCurrentDocumentUrl).not.toBeNull();
    });

    it('clears loading and cancels the pending preview when returning to the list', () => {
        http.expectOne(base).flush([]);
        component.selectDocument(file(1));
        const request = http.expectOne(`${base}/1/content`);
        component.clearViewer();
        expect(request.cancelled).toBe(true);
        expect(component.currentDocument).toBeNull();
        expect(component.isLoadingDocument).toBe(false);
    });

    it('renders a retry action instead of an empty PDF frame after preview failure', () => {
        http.expectOne(base).flush([]);
        component.selectDocument(file(1, 'pdf'));
        http.expectOne(`${base}/1/content`).flush(null, { status: 503, statusText: 'Unavailable' });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
        const alert = fixture.nativeElement.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        alert.querySelector('button').click();
        http.expectOne(`${base}/1/content`).flush(new Blob(['PDF'], { type: 'application/pdf' }));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('iframe')?.getAttribute('title')).toContain('Documento 1');
    });

    it('keeps the original file name if selection changes during a download', () => {
        http.expectOne(base).flush([]);
        component.selectDocument(file(1, 'docx'));
        let downloadedName = '';
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            downloadedName = this.download;
        });
        component.downloadCurrent();
        const request = http.expectOne(`${base}/1/content`);
        component.selectDocument(file(2, 'docx'));
        request.flush(new Blob(['Arquivo']));
        expect(downloadedName).toBe('1.docx');
    });

    it('cancels pending document requests when the viewer is destroyed', () => {
        http.expectOne(base).flush([]);
        component.selectDocument(file(1));
        const request = http.expectOne(`${base}/1/content`);
        fixture.destroy();
        expect(request.cancelled).toBe(true);
    });
});
