import { NgZone } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';
import { NotificationService } from './notification.service';
import { NotificationAlertService } from './notification-alert.service';

describe('NotificationAlertService media playback', () => {
  let service: NotificationAlertService;
  let audio: HTMLAudioElement;
  let documentForAudio: Document;
  let messages: BehaviorSubject<any>;
  let createAudioContext: jasmine.Spy;
  let scheduleIdle: jasmine.Spy;

  beforeEach(() => {
    documentForAudio = document.implementation.createHTMLDocument();
    documentForAudio.head.innerHTML = '<base href="https://portal.example/">';
    createAudioContext = jasmine.createSpy('AudioContext');
    scheduleIdle = jasmine.createSpy('requestIdleCallback');
    Object.defineProperty(documentForAudio, 'defaultView', { value: {
      AudioContext: createAudioContext, requestIdleCallback: scheduleIdle
    } });
    audio = {
      preload: '', src: '', muted: false, currentTime: 0,
      load: jasmine.createSpy('load'), pause: jasmine.createSpy('pause'),
      play: jasmine.createSpy('play').and.returnValue(Promise.resolve()),
      removeAttribute: jasmine.createSpy('removeAttribute')
    } as unknown as HTMLAudioElement;
    spyOn(documentForAudio, 'createElement').and.returnValue(audio);
    messages = new BehaviorSubject(null);
    service = new NotificationAlertService(documentForAudio,
      { getUserInfo: () => 1 } as unknown as AuthService,
      { totalUnreadCount$: of(0), messageReceived$: messages,
        getTotalUnreadChatsCount: () => of(0) } as unknown as ChatService,
      { unreadCount$: of(0), onNotificationReceived: () => () => {},
        getUnreadCount: () => of(0) } as unknown as NotificationService,
      new NgZone({ enableLongStackTrace: false }));
  });

  afterEach(() => service.ngOnDestroy());

  it('preloads the notification asset without creating an AudioContext or an idle handler', () => {
    service.initialize();
    expect(audio.preload).toBe('auto');
    expect(audio.src).toBe('https://portal.example/assets/sounds/notification.wav');
    expect(audio.load).toHaveBeenCalledTimes(1);
    expect(createAudioContext).not.toHaveBeenCalled();
    expect(scheduleIdle).not.toHaveBeenCalled();
  });

  it('silently unlocks playback once on pointer or keyboard input', async () => {
    service.initialize();
    documentForAudio.dispatchEvent(new Event('pointerdown'));
    expect(audio.muted).toBeTrue();
    await Promise.resolve();
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.muted).toBeFalse();
    documentForAudio.dispatchEvent(new Event('keydown'));
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(createAudioContext).not.toHaveBeenCalled();
  });

  it('plays incoming messages after keyboard activation and skips the users own messages', async () => {
    service.initialize();
    messages.next({ senderId: 2 });
    expect(audio.play).not.toHaveBeenCalled();
    documentForAudio.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    messages.next({ senderId: 1 });
    expect(audio.play).toHaveBeenCalledTimes(1);
    messages.next({ senderId: 2 });
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.muted).toBeFalse();
  });

  it('does not stop a notification when an earlier unlock promise finishes', async () => {
    let finishUnlock!: () => void;
    const pending = new Promise<void>(resolve => finishUnlock = resolve);
    (audio.play as jasmine.Spy).and.returnValues(pending, Promise.resolve());
    service.initialize();
    documentForAudio.dispatchEvent(new Event('pointerdown'));
    messages.next({ senderId: 2 });
    finishUnlock();
    await pending;
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.muted).toBeFalse();
  });

  it('removes listeners and releases media when destroyed', () => {
    service.initialize();
    service.ngOnDestroy();
    documentForAudio.dispatchEvent(new Event('pointerdown'));
    messages.next({ senderId: 2 });
    expect(audio.play).not.toHaveBeenCalled();
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.removeAttribute).toHaveBeenCalledWith('src');
  });
});
