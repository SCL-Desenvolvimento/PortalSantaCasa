import { Component, OnInit, OnDestroy } from '@angular/core';
import { OnlineService, OnlineUser } from '../../../core/services/online.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-online-users',
  standalone: false,
  templateUrl: './online-users.component.html'
})
export class OnlineUsersComponent implements OnInit, OnDestroy {
  onlineUsers: OnlineUser[] = [];
  private sub?: Subscription;
  isLoading = true;

  constructor(public signalr: OnlineService) { }

  ngOnInit() {
    // Primeiro, tentar obter via HTTP para mostrar dados imediatamente
    this.signalr.getOnlineViaHttp().subscribe({
      next: (users) => {
        this.onlineUsers = users;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    // Depois, inscrever para atualizações em tempo real
    this.sub = this.signalr.onlineUsers$.subscribe(users => {
      this.onlineUsers = users;
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // Método para recarregar lista manualmente
  refreshList() {
    this.isLoading = true;
    this.signalr.requestOnlineUsers();
  }
}
