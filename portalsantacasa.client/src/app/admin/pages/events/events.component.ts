import { Component, OnInit } from '@angular/core';
import { EventService } from '../../../services/event.service';
import { Event } from '../../../models/event.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-events',
  standalone: false,
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class EventsComponent implements OnInit {
  events: Event[] = [];
  eventData: Event = this.resetEvent();
  showModal = false;
  isEdit = false;
  modalTitle: string = '';
  imageFile: File | null = null;
  isLoading = false;
  // paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  constructor(
    private eventService: EventService,
    private toastr: ToastrService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(page: number = 1): void {
    this.isLoading = true;
    this.eventService.getEventPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.events = data.events.map((event) => ({
          ...event,
          eventDate: event.eventDate,
        }));
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Erro ao carregar eventos');
        this.isLoading = false;
      }
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadEvents(page);
    }
  }

  showEventModal(eventId: number | null = null): void {
    this.isEdit = !!eventId;
    this.modalTitle = this.isEdit ? 'Editar Evento' : 'Novo Evento';

    if (eventId) {
      this.eventService.getEventById(eventId).subscribe({
        next: (event) => {
          this.eventData = { ...event };
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar evento')
      });
    } else {
      this.eventData = this.resetEvent();
      this.imageFile = null;
      this.openModal();
    }
  }

  saveEvent(): void {
    if (!this.eventData.title || !this.eventData.eventDate) {
      this.toastr.error('Preencha os campos obrigatórios.');
      return;
    }

    const formData = new FormData();
    formData.append('title', this.eventData.title);
    formData.append('description', this.eventData.description || '');
    formData.append('location', this.eventData.location || '');
    formData.append('eventDate', this.eventData.eventDate);
    formData.append('userId', this.authService.getUserInfo('id')?.toString() ?? '');
    formData.append('isActive', this.eventData.isActive.toString());

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    this.isLoading = true;

    const request = this.isEdit && this.eventData.id
      ? this.eventService.updateEvent(this.eventData.id, formData)
      : this.eventService.createEvent(formData);

    request.subscribe({
      next: () => {
        this.toastr.success('Evento salvo com sucesso!');
        this.closeModal();
        this.loadEvents(this.currentPage);
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Erro ao salvar evento');
        this.isLoading = false;
      }
    });
  }

  deleteEvent(eventId: number | undefined): void {
    if (!eventId)
      return;

    Swal.fire({
      title: 'Tem certeza?',
      text: 'Você não poderá reverter esta ação!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.eventService.deleteEvent(eventId).subscribe({
          next: () => {
            this.toastr.success('Evento excluído com sucesso!');
            this.loadEvents(this.currentPage);
            this.isLoading = false;
          },
          error: () => {
            this.toastr.error('Erro ao excluir evento');
            this.isLoading = false;
          }
        });
      }
    });
  }

  //onFileChange(event: Event): void {
  //  const input = event.target as HTMLInputElement;
  //  if (input.files?.length) {
  //    this.imageFile = input.files[0];
  //  }
  //}

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  resetEvent(): Event {
    return {
      id: 0,
      title: '',
      description: '',
      eventDate: '',
      location: '',
      isActive: true,
      createdAt: new Date(),
      responsibleName: ''
    };
  }
}
