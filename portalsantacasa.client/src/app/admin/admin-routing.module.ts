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
import { OnlineUsersComponent } from './pages/online-users/online-users.component';
import { DiagnosticoComponent } from './pages/diagnostico/diagnostico.component';
import { AtualizacaoArquivosComponent } from './pages/atualizacao-arquivos/atualizacao-arquivos.component';
import { RoleGuard } from '../core/guards/role.guard';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent, canActivate: [RoleGuard], data: { title: 'Dashboard', roles: ['admin', 'editor', 'viewer'] } },
  { path: 'news', component: NewsComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Notícias', roles: ['admin', 'editor'] } },
  { path: 'documents', component: DocumentsComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Documentos', roles: ['admin', 'editor'] } },
  { path: 'birthdays', component: BirthdaysComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Aniversariantes', roles: ['admin', 'editor'] } },
  { path: 'menu', component: MenuComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Cardápio', roles: ['admin', 'editor'] } },
  { path: 'events', component: EventsComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Eventos', roles: ['admin', 'editor'] } },
  { path: 'feedbacks', component: FeedbacksComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Feedbacks', roles: ['admin', 'editor'] } },
  { path: 'users', component: UsersComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Usuários', roles: ['admin'] } },
  { path: 'banners', component: BannersComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Banners', roles: ['admin', 'editor'] } },
  { path: 'internal', component: InternalAnnouncementComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Comunicados internos', roles: ['admin', 'editor'] } },
  { path: 'chat', component: ChatComponent, canActivate: [RoleGuard], data: { title: 'Chat Interno', roles: ['admin', 'editor', 'viewer'] } },
  { path: 'courses-register', component: CourseRegistrationComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Cursos', roles: ['admin', 'editor'] } },
  { path: 'courses-tracking/:id', component: CourseTrackingComponent, canActivate: [RoleGuard], data: { title: 'Rastreamento de Cursos', roles: ['admin', 'editor'] } },
  { path: 'courses-view', component: CourseViewerComponent, canActivate: [RoleGuard], data: { title: 'Meus Cursos', roles: ['admin', 'editor', 'viewer'] } },
  { path: 'forms-register', component: FormsRegisterComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar Formulários', roles: ['admin', 'editor'] } },
  { path: 'online-users', component: OnlineUsersComponent, canActivate: [RoleGuard], data: { title: 'Gerenciar usuários onlines', roles: ['admin']} },
  { path: 'cid', component: DiagnosticoComponent, canActivate: [RoleGuard], data: { title: 'Processamento de Diagnóstico', roles: ['admin'] } },
  { path: 'atualizacao', component: AtualizacaoArquivosComponent, canActivate: [RoleGuard], data: { title: 'Atualização de tabelas SIGTAP/TUSS', roles: ['admin'] } },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule { }
