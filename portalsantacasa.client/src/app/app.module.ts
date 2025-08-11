import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
registerLocaleData(localePt);
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


//Components
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { NewsDetailComponent } from './pages/news-detail/news-detail.component';
import { DocumentsViewComponent } from './pages/documents-view/documents-view.component';
import { PublicLayoutComponent } from './layout/public-layout/public-layout.component';
import { AuthInterceptor } from './guards/auth.interceptor';
import { NewsViewComponent } from './pages/news-view/news-view.component';
import { FolderNodeComponent } from './pages/folder-node/folder-node.component';

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
    FolderNodeComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    QuillModule.forRoot(),
    ToastrModule.forRoot({ positionClass: 'toast-bottom-right', timeOut: 3000 }),
    BrowserAnimationsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'pt' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
