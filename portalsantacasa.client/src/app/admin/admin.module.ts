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

// Páginas admin
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NewsComponent } from './pages/news/news.component';
import { DocumentsComponent } from './pages/documents/documents.component';
import { BirthdaysComponent } from './pages/birthdays/birthdays.component';
import { MenuComponent } from './pages/menu/menu.component';
import { EventsComponent } from './pages/events/events.component';
import { FeedbacksComponent } from './pages/feedbacks/feedbacks.component';
import { UsersComponent } from './pages/users/users.component';
import { BannersComponent } from './pages/banners/banners.component';

// Services
import { SidebarConfigService } from '../admin/components/admin-sidebar/sidebar-config.service';

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
    BannersComponent
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
  providers: [

  ],
  exports: [
    AdminSidebarComponent
  ]
})
export class AdminModule { }
