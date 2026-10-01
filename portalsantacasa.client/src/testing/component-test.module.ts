import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { BehaviorSubject, of } from 'rxjs';
import { OnlineService } from '../app/core/services/online.service';
import { ChatService } from '../app/core/services/chat.service';
import { NotificationService } from '../app/core/services/notification.service';

// Component tests keep HTTP requests in the test backend and replace live hub connections.
@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientTestingModule,
    RouterTestingModule, NoopAnimationsModule, ToastrModule.forRoot()],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientTestingModule,
    RouterTestingModule, NoopAnimationsModule, ToastrModule],
  providers: [
    { provide: OnlineService, useFactory: () => ({
      onlineUsers$: new BehaviorSubject([]), getOnlineViaHttp: () => of([]),
      startConnection: () => Promise.resolve(), stopConnection: () => Promise.resolve(), requestOnlineUsers: () => {}
    }) },
    { provide: ChatService, useFactory: () => ({
      messageReceived$: new BehaviorSubject(null), messageUpdated$: new BehaviorSubject(null),
      messageReactionsUpdated$: new BehaviorSubject(null), newChat$: new BehaviorSubject(null),
      chatUpdated$: new BehaviorSubject(null), totalUnreadCount$: new BehaviorSubject(0),
      connectionState$: new BehaviorSubject('disconnected'), getUserChats: () => of([]),
      getTotalUnreadChatsCount: () => of(0), joinChatGroup: () => Promise.resolve(), leaveChatGroup: () => Promise.resolve()
    }) },
    { provide: NotificationService, useFactory: () => ({
      unreadCount$: new BehaviorSubject(0), getUserNotification: () => of([]), getUnreadCount: () => of(0),
      onNotificationReceived: () => () => {}, onNotificationsDeleted: () => () => {},
      startConnection: () => Promise.resolve(), stopConnection: () => Promise.resolve()
    }) }
  ]
})
export class ComponentTestModule {}
