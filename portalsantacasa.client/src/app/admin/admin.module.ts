// Modules
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { AdminRoutingModule } from './admin-routing.module';
import { ReactiveFormsModule } from '@angular/forms';

// Components
import { AdminComponent } from './admin.component';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from './components/admin-header/admin-header.component';
import { AdminFooterComponent } from './components/admin-footer/admin-footer.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NewsComponent } from './pages/news/news.component';
import { DocumentsComponent } from './pages/documents/documents.component';
import { BirthdaysComponent } from './pages/birthdays/birthdays.component';
import { MenuComponent } from './pages/menu/menu.component';
import { EventsComponent } from './pages/events/events.component';
import { FeedbacksComponent } from './pages/feedbacks/feedbacks.component';
import { UsersComponent } from './pages/users/users.component';
import { BannersComponent } from './pages/banners/banners.component';

//Interceptors
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from '../guards/auth.interceptor';

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
    BannersComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    QuillModule.forRoot()
  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }]
})
export class AdminModule { }
