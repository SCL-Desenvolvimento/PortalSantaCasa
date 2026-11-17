import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DEPARTMENTS } from '../../../shared/constants/departments.constants';

interface ContactInput {
  title: string;
  department: string;
  extension: string;
  hours: string;
  keywords: string;
  channelUrl: string;
  isActive: boolean;
  revision: number;
}

interface Contact extends ContactInput {
  id: number;
  canEdit: boolean;
}

interface Directory {
  items: Contact[];
  canCreate: boolean;
  department: string | null;
}

@Component({
  selector: 'app-department-contacts',
  imports: [FormsModule, NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './department-contacts.component.html',
  styleUrls: ['../../styles/staff-operations.css', './department-contacts.component.css']
})
export class DepartmentContactsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly url = `${environment.apiUrl}/department-contacts`;

  readonly departments = DEPARTMENTS;
  readonly directory = signal<Directory | null>(null);
  readonly selection = signal<Contact | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly feedback = signal('');
  readonly appliedSearch = signal('');
  readonly editor = signal<{ id: number | null; input: ContactInput } | null>(null);
  search = '';

  @ViewChild('contactTitle') set contactTitle(field: ElementRef<HTMLInputElement> | undefined) {
    field?.nativeElement.focus();
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const contactId = Number(params.get('contato'));
      this.selection.set(null);
      this.load();
      if (Number.isSafeInteger(contactId) && contactId > 0) {
        this.http.get<Contact>(`${this.url}/${contactId}`).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: contact => this.selection.set(contact),
          error: () => this.error.set('O contato selecionado não está disponível.')
        });
      }
    });
  }

  load(): void {
    const query = this.search.trim();
    this.error.set('');
    this.loading.set(true);
    this.http.get<Directory>(this.url, { params: { q: query } }).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))
    ).subscribe({
      next: result => {
        this.directory.set(result);
        this.appliedSearch.set(query);
      },
      error: () => this.error.set('Não foi possível carregar os ramais.')
    });
  }

  clearSearch(): void {
    this.search = '';
    this.load();
  }

  edit(contact?: Contact): void {
    this.feedback.set('');
    this.formError.set('');
    const input = contact ? { ...contact } : {
      title: '', department: this.directory()?.department ?? '', extension: '', hours: '', keywords: '', channelUrl: '', isActive: true, revision: 0
    };
    this.editor.set({ id: contact?.id ?? null, input });
  }

  save(form: NgForm): void {
    const editor = this.editor();
    if (!editor || form.invalid || this.saving()) return;
    this.formError.set('');
    this.saving.set(true);
    const request = editor.id == null
      ? this.http.post<Contact>(this.url, editor.input)
      : this.http.put<Contact>(`${this.url}/${editor.id}`, editor.input);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
      next: result => {
        this.editor.set(null);
        if (this.selection()?.id === result.id) this.selection.set(result);
        this.feedback.set('Contato salvo.');
        this.load();
      },
      error: (error: HttpErrorResponse) => this.formError.set(error.error?.message ?? 'Não foi possível salvar. Confira os campos e o link de atendimento.')
    });
  }
}
