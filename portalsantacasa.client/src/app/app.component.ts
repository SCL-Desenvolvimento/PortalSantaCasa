import { HttpClient } from '@angular/common/http';
import { Component, OnInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) { }

  ngOnInit() {
  }

  title = 'portal santa casa';

  // Desabilitar atalho de impressão Ctrl+P
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Verifica se é Ctrl+P (ou Cmd+P no Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      event.stopPropagation();
      console.log('Impressão desabilitada nesta aplicação.');
      return false;
    }
    return true;
  }

  // Desabilitar menu de contexto (botão direito) que contém opção de imprimir
  @HostListener('document:contextmenu', ['$event'])
  handleContextMenuEvent(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    console.log('Menu de contexto desabilitado nesta aplicação.');
    return false;
  }
}
