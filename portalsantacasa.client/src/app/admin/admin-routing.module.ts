import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { BirthdaysComponent } from './pages/birthdays/birthdays.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DocumentsComponent } from './pages/documents/documents.component';
import { EventsComponent } from './pages/events/events.component';
import { FeedbacksComponent } from './pages/feedbacks/feedbacks.component';
import { MenuComponent } from './pages/menu/menu.component';
import { NewsComponent } from './pages/news/news.component';
import { UsersComponent } from './pages/users/users.component';
import { BannersComponent } from './pages/banners/banners.component';

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
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule { }
