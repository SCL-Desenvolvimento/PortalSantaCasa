import { HttpClientModule } from '@angular/common/http';
import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Layout público
import { HomeComponent } from './pages/home/home.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { NewsDetailComponent } from './pages/news-detail/news-detail.component';
import { DocumentsViewComponent } from './pages/documents-view/documents-view.component';
import { PublicLayoutComponent } from './layout/public-layout/public-layout.component';
import { NewsViewComponent } from './pages/news-view/news-view.component';
import { FolderNodeComponent } from './pages/folder-node/folder-node.component';
import { FormsComponent } from './pages/forms/forms.component';

// Core & Shared
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

registerLocaleData(localePt);

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    HeaderComponent,
    FooterComponent,
    NewsDetailComponent,
    DocumentsViewComponent,
    PublicLayoutComponent,
    NewsViewComponent,
    FolderNodeComponent,
    FormsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    QuillModule.forRoot(),
    ToastrModule.forRoot({
      positionClass: 'toast-bottom-right',
      timeOut: 3000
    }),
    BrowserAnimationsModule,
    CoreModule,
    SharedModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'pt' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
