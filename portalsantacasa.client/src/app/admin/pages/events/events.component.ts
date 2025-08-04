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
  message: { text: string, type: string } | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadEventsAdmin();
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

  showEventsManagement(): void {
    // Implement if needed (e.g., open modal for new event)
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
