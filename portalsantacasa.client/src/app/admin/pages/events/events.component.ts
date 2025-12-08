import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { EventService } from '../../../core/services/event.service';
import { Event } from '../../../models/event.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-events',
  standalone: false,
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class EventsComponent implements OnInit {
  // Data
  events: Event[] = [];
  filteredEvents: Event[] = [];

  // Modal
  showModal = false;
  modalTitle = '';
  isEdit = false;
  isLoading = false;

  // Form
  eventData: Event = this.getEmptyEvent();
  eventDateFormatted = '';
  eventTimeFormatted = '';

  // Filters
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'upcoming' | 'past' = 'all';

  // Pagination
  currentPage = 1;
  perPage = 12;
  totalPages = 0;

  // Stats
  totalEvents = 0;
  activeEvents = 0;
  upcomingEvents = 0;

  constructor(
    private router: Router,
    private eventService: EventService,
    private toastr: ToastrService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadEvents();
  }

  private getEmptyEvent(): Event {
    return {
      id: 0,
      title: '',
      description: '',
      eventDate: '',
      responsibleName: '',
      createdAt: new Date(),
      location: '',
      isActive: true
    };
  }

  // =====================
  // 📌 CRUD
  // =====================
  loadEvents(page: number = 1): void {
    this.isLoading = true;
    this.eventService.getEventPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.events = data.events;
        this.filteredEvents = [...this.events];
        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.applyFilters();
        this.updateStats();
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Erro ao carregar eventos');
        this.isLoading = false;
      }
    });
  }

  saveEvent(): void {
    this.isLoading = true;

    // Combinar data e hora em ISO
    const combinedDateTime = `${this.eventDateFormatted}T${this.eventTimeFormatted}:00Z`;
    this.eventData.eventDate = combinedDateTime;

    const formData = new FormData();
    formData.append('title', this.eventData.title);
    formData.append('description', this.eventData.description || '');
    formData.append('location', this.eventData.location || '');
    formData.append('eventDate', this.eventData.eventDate);
    formData.append('userId', this.authService.getUserInfo('id')?.toString() ?? '');
    formData.append('isActive', this.eventData.isActive.toString());

    const request = this.isEdit && this.eventData.id
      ? this.eventService.updateEvent(this.eventData.id, formData)
      : this.eventService.createEvent(formData);

    request.subscribe({
      next: () => {
        this.toastr.success('Evento salvo com sucesso!');
        this.closeModal();
        this.loadEvents(this.currentPage);
      },
      error: () => {
        this.toastr.error('Erro ao salvar evento');
        this.isLoading = false;
      }
    });
  }

  deleteEvent(id?: number): void {
    if (!id) return;

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
        this.eventService.deleteEvent(id).subscribe({
          next: () => {
            this.toastr.success('Evento excluído com sucesso!');
            this.loadEvents(this.currentPage);
          },
          error: () => {
            this.toastr.error('Erro ao excluir evento');
            this.isLoading = false;
          }
        });
      }
    });
  }


  toggleEventStatus(event: Event): void {
    if (!event.id) return;

    event.isActive = !event.isActive;

    const formData = new FormData();
    formData.append('title', event.title);
    formData.append('description', event.description || '');
    formData.append('location', event.location || '');
    formData.append('eventDate', event.eventDate);
    formData.append('userId', this.authService.getUserInfo('id')?.toString() ?? '');
    formData.append('isActive', event.isActive.toString());

    this.eventService.updateEvent(event.id, formData).subscribe({
      next: () => {
        this.toastr.success('Status atualizado com sucesso!');
        this.loadEvents(this.currentPage);
      },
      error: () => {
        this.toastr.error('Erro ao atualizar status');
      }
    });
  }

  // =====================
  // 📌 Filtros e Paginação
  // =====================
  applyFilters(): void {
    let filtered = [...this.events];
    const now = new Date();

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term) ||
        event.location.toLowerCase().includes(term)
      );
    }

    switch (this.statusFilter) {
      case 'active':
        filtered = filtered.filter(event => event.isActive);
        break;
      case 'upcoming':
        filtered = filtered.filter(event => event.isActive && new Date(event.eventDate) > now);
        break;
      case 'past':
        filtered = filtered.filter(event => new Date(event.eventDate) < now);
        break;
    }

    filtered.sort((a, b) =>
      new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    );

    this.filteredEvents = filtered;
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredEvents.length / this.perPage);
    const startIndex = (this.currentPage - 1) * this.perPage;
    const endIndex = startIndex + this.perPage;
    this.filteredEvents = this.filteredEvents.slice(startIndex, endIndex);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
    this.calculatePagination();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadEvents(page);
    }
  }

  setStatusFilter(filter: 'all' | 'active' | 'upcoming' | 'past'): void {
    this.statusFilter = filter;
    this.currentPage = 1;
    this.applyFilters();
    this.calculatePagination();
  }

  updateStats(): void {
    const now = new Date();
    this.totalEvents = this.events.length;
    this.activeEvents = this.events.filter(e => e.isActive).length;
    this.upcomingEvents = this.events.filter(e =>
      e.isActive && new Date(e.eventDate) > now
    ).length;
  }

  // =====================
  // 📌 Modal
  // =====================
  showEventModal(eventId?: number): void {
    this.isEdit = !!eventId;
    this.modalTitle = this.isEdit ? 'Editar Evento' : 'Novo Evento';

    if (eventId) {
      this.eventService.getEventById(eventId).subscribe({
        next: (event) => {
          this.eventData = { ...event };
          this.setDateTimeFromEvent(event.eventDate);
          this.showModal = true;
        },
        error: () => this.toastr.error('Erro ao carregar evento')
      });
    } else {
      this.eventData = this.getEmptyEvent();
      this.eventDateFormatted = '';
      this.eventTimeFormatted = '';
      this.showModal = true;
    }
  }

  private setDateTimeFromEvent(eventDate: string): void {
    const date = new Date(eventDate);
    this.eventDateFormatted = date.toISOString().split('T')[0];
    this.eventTimeFormatted = date.toTimeString().slice(0, 5);
  }

  closeModal(): void {
    this.showModal = false;
    this.eventData = this.getEmptyEvent();
    this.eventDateFormatted = '';
    this.eventTimeFormatted = '';
    this.isLoading = false;
  }

  // =====================
  // 📌 Helpers p/ template
  // =====================
  getEventDay(eventDate: string): string {
    return new Date(eventDate).getDate().toString().padStart(2, '0');
  }

  getEventMonth(eventDate: string): string {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
      'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    return months[new Date(eventDate).getMonth()];
  }
}
