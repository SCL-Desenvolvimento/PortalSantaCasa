import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

import { AuthService } from './auth.service';
import { ChatService } from './chat.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class NotificationAlertService {
  private readonly baseTitle = 'Portal da Santa Casa de Lorena';
  private readonly subscriptions = new Subscription();
  private audioContext?: AudioContext;
  private initialized = false;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService
  ) { }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.registerAudioUnlock();

    this.subscriptions.add(
      combineLatest([
        this.chatService.totalUnreadCount$,
        this.notificationService.unreadCount$
      ]).pipe(
        map(([unreadChats, unreadNotifications]) => unreadChats + unreadNotifications),
        distinctUntilChanged()
      ).subscribe(total => {
        this.document.title = total > 0
          ? `(${total}) ${this.baseTitle}`
          : this.baseTitle;
      })
    );

    this.subscriptions.add(
      this.chatService.messageReceived$.pipe(
        filter(message => !!message && message.senderId !== this.authService.getUserInfo('id'))
      ).subscribe(() => this.playSound())
    );

    const removeNotificationListener = this.notificationService.onNotificationReceived(notification => {
      if (!notification.isRead) this.playSound();
    });
    this.subscriptions.add({ unsubscribe: removeNotificationListener });

    this.chatService.getTotalUnreadChatsCount().subscribe({ error: () => undefined });
    this.notificationService.getUnreadCount().subscribe({ error: () => undefined });
  }

  private registerAudioUnlock(): void {
    const unlock = () => {
      const context = this.getAudioContext();
      if (context?.state === 'suspended') {
        void context.resume();
      }
    };

    this.document.addEventListener('pointerdown', unlock, { once: true });
    this.document.addEventListener('keydown', unlock, { once: true });
  }

  private playSound(): void {
    const context = this.getAudioContext();
    if (!context) return;

    const start = context.currentTime;
    this.playTone(context, 659.25, start, 0.12);
    this.playTone(context, 880, start + 0.14, 0.16);

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }
  }

  private playTone(context: AudioContext, frequency: number, start: number, duration: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(5.0, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  private getAudioContext(): AudioContext | undefined {
    if (this.audioContext) return this.audioContext;

    const AudioContextType = window.AudioContext;
    if (!AudioContextType) return undefined;

    this.audioContext = new AudioContextType();
    return this.audioContext;
  }
}
