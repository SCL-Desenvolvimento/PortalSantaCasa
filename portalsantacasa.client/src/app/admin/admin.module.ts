import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { QuillModule } from 'ngx-quill';
import { AdminRoutingModule } from './admin-routing.module';

// Layout admin
import { AdminComponent } from './admin.component';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from './components/admin-header/admin-header.component';
import { AdminFooterComponent } from './components/admin-footer/admin-footer.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

// Paginas admin
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NewsComponent } from './pages/news/news.component';
import { DocumentsComponent } from './pages/documents/documents.component';
import { BirthdaysComponent } from './pages/birthdays/birthdays.component';
import { MenuComponent } from './pages/menu/menu.component';
import { EventsComponent } from './pages/events/events.component';
import { FeedbacksComponent } from './pages/feedbacks/feedbacks.component';
import { UsersComponent } from './pages/users/users.component';
import { BannersComponent } from './pages/banners/banners.component';
import { InternalAnnouncementComponent } from './pages/internal-announcement/internal-announcement.component';
import { ChatComponent } from './pages/chat/chat.component';
import { CourseRegistrationComponent } from './pages/course-registration/course-registration.component';
import { CourseViewerComponent } from './pages/course-viewer/course-viewer.component';
import { FormsRegisterComponent } from './pages/forms/forms-register.component';
import { CourseTrackingComponent } from './pages/course-tracking/course-tracking.component';
import { OnlineUsersComponent } from './pages/online-users/online-users.component';
import { DiagnosticoComponent } from './pages/diagnostico/diagnostico.component';
import { AtualizacaoArquivosComponent } from './pages/atualizacao-arquivos/atualizacao-arquivos.component';
import { PublicAccessLogComponent } from './pages/public-access-log/public-access-log.component';

// Shared
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    AdminComponent,
    DashboardComponent,
    NewsComponent,
    DocumentsComponent,
    BirthdaysComponent,
    MenuComponent,
    EventsComponent,
    FeedbacksComponent,
    UsersComponent,
    AdminSidebarComponent,
    AdminHeaderComponent,
    AdminFooterComponent,
    AdminLayoutComponent,
    BannersComponent,
    InternalAnnouncementComponent,
    ChatComponent,
    CourseRegistrationComponent,
    CourseViewerComponent,
    CourseTrackingComponent,
    FormsRegisterComponent,
    OnlineUsersComponent,
    DiagnosticoComponent,
    AtualizacaoArquivosComponent,
    PublicAccessLogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    QuillModule.forRoot(),
    AdminRoutingModule,
    SharedModule
  ],
  providers: [],
  exports: [
    AdminSidebarComponent
  ]
})
export class AdminModule { }
