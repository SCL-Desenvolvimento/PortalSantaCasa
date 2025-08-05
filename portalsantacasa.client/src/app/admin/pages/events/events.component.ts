import { Component, OnInit } from '@angular/core';
import { EventService } from '../../../services/event.service';
import { Event } from '../../../models/event.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-events',
  standalone: false,
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent implements OnInit {
  events: Event[] = [];
  eventData: Event = this.resetEvent();
  message: { text: string, type: string } | null = null;
  showModal = false;
  isEdit = false;
  modalTitle: string = '';
  selectedEvents: Event | null = null;
  imageFile: File | null = null;

  constructor(private eventService: EventService) { }

  ngOnInit(): void {
    this.loadEventsAdmin();
  }

  loadEventsAdmin(): void {
    this.eventService.getEvent().subscribe({
      next: (data) => {
        this.events = data.map((event) => ({
          id: event.id,
          title: event.title,
          location: event.location,
          description: event.description,
          isActive: event.isActive,
          createdAt: event.createdAt,
          eventDate: event.eventDate
        }));
      },
      error: (error) => {
        this.showMessage(`Erro ao carregar eventos: ${error.message}`, 'error');
      }
    });
  }

  showEventModal(eventsId: number | null = null): void {
    this.isEdit = eventsId !== null;
    this.modalTitle = this.isEdit ? 'Editar Notícia' : 'Nova Notícia';
    if (eventsId) {
      this.eventService.getEventById(eventsId).subscribe({
        next: (events) => {
          this.selectedEvents = events;
          this.eventData = { ...events };
          this.openModal();
        },
        error: (error) => {
          this.showMessage(`Erro ao carregar notícia: ${error.message}`, 'error');
        }
      });
    } else {
      this.selectedEvents = null;
      this.eventData = this.resetEvent();
      this.imageFile = null;
      this.openModal();
    }
  }

  saveEvent(): void {
    const formData = new FormData();
    formData.append('title', this.eventData.title);
    formData.append('location', this.eventData.location || '');
    formData.append('description', this.eventData.description || '');
    formData.append('createdAt', this.eventData.createdAt.toString());
    formData.append('eventDate', this.eventData.eventDate.toString());
    formData.append('isActive', this.eventData.isActive.toString());

    this.submitEventForm(formData);
  }

  submitEventForm(formData: FormData): void {
    const request = this.isEdit && this.selectedEvents?.id
      ? this.eventService.updateEvent(this.selectedEvents.id, formData)
      : this.eventService.createEvent(formData);
    request.subscribe({
      next: (data) => {
        this.closeModal();
        //this.showMessage(data.message, 'success');
        this.loadEventsAdmin();
      },
      error: (error) => {
        this.showMessage(error.message || 'Erro ao salvar notícia', 'error');
      }
    });
  }

  deleteEvent(eventId?: number): void {
    if (!eventId) {
      console.warn('ID inválido ao tentar deletar notícia.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir esta notícia?')) {
      this.eventService.deleteEvent(eventId).subscribe({
        next: (data) => {
          console.log(data);
          //this.showMessage(data.message, 'success');
          this.loadEventsAdmin();
        },
        error: (error) => {
          this.showMessage(error.message || 'Erro ao excluir notícia', 'error');
        }
      });
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  resetEvent(): Event {
    return {
      title: '',
      description: '',
      eventDate: new Date(),
      location: '',
      isActive: true,
      createdAt: new Date()
    };
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
