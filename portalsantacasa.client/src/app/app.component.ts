import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
declare let _paq: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent {

  constructor(private router: Router, private title: Title) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const url = e.urlAfterRedirects;
        _paq.push(['setCustomUrl', url]);
        _paq.push(['setDocumentTitle', this.title.getTitle() || document.title]);
        _paq.push(['trackPageView']);
      });
  }
}
