import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components Existentes
import { BirthdaysComponent } from './pages/birthdays/birthdays.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DocumentsComponent } from './pages/documents/documents.component';
import { EventsComponent } from './pages/events/events.component';
import { FeedbacksComponent } from './pages/feedbacks/feedbacks.component';
import { MenuComponent } from './pages/menu/menu.component';
import { NewsComponent } from './pages/news/news.component';
import { UsersComponent } from './pages/users/users.component';
import { BannersComponent } from './pages/banners/banners.component';
import { InternalAnnouncementComponent } from './pages/internal-announcement/internal-announcement.component';
import { ChatComponent } from './pages/chat/chat.component';
import { CourseRegistrationComponent } from './pages/course-registration/course-registration.component';
import { CourseTrackingComponent } from './pages/course-tracking/course-tracking.component';
import { CourseViewerComponent } from './pages/course-viewer/course-viewer.component';
import { FormsRegisterComponent } from './pages/forms/forms-register.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' } },
  { path: 'news', component: NewsComponent, data: { title: 'Gerenciar Notícias' } },
  { path: 'documents', component: DocumentsComponent, data: { title: 'Gerenciar Documentos' } },
  { path: 'birthdays', component: BirthdaysComponent, data: { title: 'Gerenciar Aniversariantes' } },
  { path: 'menu', component: MenuComponent, data: { title: 'Gerenciar Cardápio' } },
  { path: 'events', component: EventsComponent, data: { title: 'Gerenciar Eventos' } },
  { path: 'feedbacks', component: FeedbacksComponent, data: { title: 'Gerenciar Feedbacks' } },
  { path: 'users', component: UsersComponent, data: { title: 'Gerenciar Usuários' } },
  { path: 'banners', component: BannersComponent, data: { title: 'Gerenciar Banners' } },
  { path: 'internal', component: InternalAnnouncementComponent, data: { title: 'Gerenciar Comunicados internos' } },
  { path: 'chat', component: ChatComponent, data: { title: 'Chat Interno' } },
  { path: 'courses-register', component: CourseRegistrationComponent, data: { title: 'Cadastrar Novo Curso' } },
  { path: 'courses-tracking/:id', component: CourseTrackingComponent, data: { title: 'Rastreamento de Cursos' } },
  { path: 'courses-view', component: CourseViewerComponent, data: { title: 'Meus Cursos' } },
  { path: 'forms-register', component: FormsRegisterComponent, data: { title: 'Meus Formulários' } },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule { }
