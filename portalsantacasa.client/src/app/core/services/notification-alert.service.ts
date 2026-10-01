import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

import { AuthService } from './auth.service';
import { ChatService } from './chat.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class NotificationAlertService implements OnDestroy {
  private readonly baseTitle = 'Portal da Santa Casa de Lorena';
  private readonly subscriptions = new Subscription();
  private audio?: HTMLAudioElement;
  private initialized = false;
  private hasUserInteracted = false;
  private playbackVersion = 0;
  private removeAudioUnlock?: () => void;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService,
    private readonly ngZone: NgZone
  ) { }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.prepareAudio();

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

    this.subscriptions.add(this.chatService.getTotalUnreadChatsCount().subscribe({ error: () => undefined }));
    this.subscriptions.add(this.notificationService.getUnreadCount().subscribe({ error: () => undefined }));
  }

  private prepareAudio(): void {
    if (!this.document.defaultView) return;

    this.ngZone.runOutsideAngular(() => {
      const audio = this.document.createElement('audio');
      audio.preload = 'auto';
      audio.src = new URL('assets/sounds/notification.wav', this.document.baseURI).href;
      this.audio = audio;
      audio.load();
      this.registerAudioUnlock();
    });
  }

  private registerAudioUnlock(): void {
    const unlock = () => {
      this.removeAudioUnlock?.();
      this.hasUserInteracted = true;
      const audio = this.audio;
      if (!audio) return;
      const version = ++this.playbackVersion;
      // Unlock media playback during a user gesture without sounding on that click.
      audio.muted = true;
      void audio.play().then(() => {
        if (this.audio !== audio || version !== this.playbackVersion) return;
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {
        if (version === this.playbackVersion) audio.muted = false;
      });
    };

    this.removeAudioUnlock = () => {
      this.document.removeEventListener('pointerdown', unlock);
      this.document.removeEventListener('keydown', unlock);
      this.removeAudioUnlock = undefined;
    };
    this.document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    this.document.addEventListener('keydown', unlock, { once: true });
  }

  private playSound(): void {
    const audio = this.audio;
    if (!audio || !this.hasUserInteracted) return;
    this.ngZone.runOutsideAngular(() => {
      ++this.playbackVersion;
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      void audio.play().catch(() => undefined);
    });
  }

  ngOnDestroy(): void {
    ++this.playbackVersion;
    this.removeAudioUnlock?.();
    this.subscriptions.unsubscribe();
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = undefined;
    }
  }
}
