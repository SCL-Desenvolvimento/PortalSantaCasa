import { ComponentTestModule } from '../../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { Subject } from 'rxjs';

import { ChatComponent } from './chat.component';
import { ChatMessageDto, ChatMessageReactionsUpdatedDto } from '../../../models/chat.model';
import { ChatService } from '../../../core/services/chat.service';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentTestModule],
      declarations: [ChatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function renderConversationWithReaction(): ChatMessageDto {
    component.loggedUserId = 1;
    const message: ChatMessageDto = {
      id: 10, chatId: 5, senderId: 1, senderName: 'administrador',
      senderUsername: 'administrador', senderDepartment: 'Informática', senderAvatarUrl: '',
      content: 'teste', sentAt: new Date(), messageType: 0,
      replyToMessageId: 9, replyToSenderName: 'rossini', replyToContent: 'asda',
      replyToIsDeleted: false, isDeleted: false, isSent: true,
      reactions: [{ userId: 1, userName: 'administrador', emoji: '👍' }]
    };
    component.activeChat = {
      id: 5, name: 'rossini', avatarUrl: '', isGroup: false, isDepartmentChat: false,
      lastMessage: 'teste', lastMessageTime: message.sentAt, unreadCount: 0,
      unreadMessagesCount: 0, members: [], isDeleted: false, isOnline: false,
      messages: [message]
    };
    component.chatList = [component.activeChat];
    component['buildFinalMessageList']();
    return message;
  }

  it('keeps reaction buttons stable during repeated checks of the administrator conversation', () => {
    renderConversationWithReaction();
    expect(() => fixture.detectChanges()).not.toThrow();
    const button = fixture.nativeElement.querySelector('.reaction-pill');
    expect(button).not.toBeNull();
    expect(button.classList.contains('mine')).toBeTrue();
    for (let i = 0; i < 3; i++) {
      expect(() => fixture.detectChanges()).not.toThrow();
      expect(fixture.nativeElement.querySelector('.reaction-pill')).toBe(button);
    }
    expect(fixture.nativeElement.querySelector('.quoted-message').textContent).toContain('rossini');
  });

  it('updates reaction counts and ownership in place when realtime data changes', () => {
    renderConversationWithReaction();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.reaction-pill');
    const updates = TestBed.inject(ChatService).messageReactionsUpdated$ as Subject<ChatMessageReactionsUpdatedDto | null>;
    updates.next({ chatId: 5, messageId: 10, reactions: [
      { userId: 1, userName: 'administrador', emoji: '👍' },
      { userId: 2, userName: 'rossini', emoji: '👍' }
    ] });
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('.reaction-pill')).toBe(button);
    expect(button.querySelector('strong').textContent).toBe('2');

    updates.next({ chatId: 5, messageId: 10, reactions: [
      { userId: 2, userName: 'rossini', emoji: '👍' }
    ] });
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('.reaction-pill')).toBe(button);
    expect(button.classList.contains('mine')).toBeFalse();
    expect(button.querySelector('strong').textContent).toBe('1');
    updates.next({ chatId: 5, messageId: 10, reactions: [] });
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('.reaction-pill')).toBeNull();
  });

  it('stops consuming realtime reactions after leaving the chat screen', () => {
    const message = renderConversationWithReaction();
    const updates = TestBed.inject(ChatService).messageReactionsUpdated$ as Subject<ChatMessageReactionsUpdatedDto | null>;
    fixture.destroy();
    updates.next({ chatId: 5, messageId: 10, reactions: [] });
    expect(message.reactions.length).toBe(1);
  });

  it('schedules scrolling outside Angular and cancels the pending frame on destruction', () => {
    const scheduledZones: boolean[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake(() => {
      scheduledZones.push(NgZone.isInAngularZone());
      return 42;
    });
    const cancel = spyOn(window, 'cancelAnimationFrame');
    TestBed.inject(NgZone).run(() => {
      component['requestScrollToBottom']();
      component.ngAfterViewChecked();
    });
    expect(scheduledZones).toEqual([false]);
    fixture.destroy();
    expect(cancel).toHaveBeenCalledWith(42);
  });
});
