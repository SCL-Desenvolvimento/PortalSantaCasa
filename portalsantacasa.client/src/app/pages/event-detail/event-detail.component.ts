import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../models/event.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-event-detail',
  standalone: false,
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css'
})
export class EventDetailComponent implements OnInit {
  event?: Event;
  isLoading = true;
  notFound = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly eventService: EventService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }

    this.eventService.getPublicEventById(id).subscribe({
      next: event => {
        this.event = {
          ...event,
          mediaUrl: event.mediaUrl ? `${environment.serverUrl}${event.mediaUrl}` : undefined
        };
        this.isLoading = false;
      },
      error: () => {
        this.notFound = true;
        this.isLoading = false;
      }
    });
  }

  get isVideo(): boolean {
    return !!this.event?.mediaUrl && /\.(mp4|webm|mov)(\?|$)/i.test(this.event.mediaUrl);
  }

  goBack(): void {
    void this.router.navigate(['/'], { queryParams: { view: 'events' } });
  }
}
