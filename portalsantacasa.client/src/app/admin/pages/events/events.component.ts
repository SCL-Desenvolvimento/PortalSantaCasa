import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { Event } from '../../../models/event.model';

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

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadEventsAdmin();
  }

  showEventModal(event?: Event): void {
    this.isEdit = !!event;
    this.eventData = event ? { ...event } : this.resetEvent();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveEvent(): void {
    if (this.isEdit) {
      const index = this.events.findIndex(e => e.id === this.eventData.id);
      if (index !== -1) this.events[index] = { ...this.eventData };
    } else {
      this.eventData.id = this.generateId();
      this.eventData.created_at = new Date().toISOString();
      this.events.push({ ...this.eventData });
    }

    this.closeModal();
  }

  generateId(): number {
    return this.events.length > 0 ? Math.max(...this.events.map(e => e.id || 0)) + 1 : 1;
  }

  resetEvent(): Event {
    return {
      title: '',
      description: '',
      event_date: '',
      location: '',
      is_active: true,
      created_at: ''
    };
  }

  loadEventsAdmin(): void {
    //this.adminService.getEvents().subscribe({
    //  next: (data) => {
    //    this.events = data;
    //  },
    //  error: (error) => {
    //    this.showMessage(`Erro ao carregar eventos: ${error.message}`, 'error');
    //  }
    //});
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
