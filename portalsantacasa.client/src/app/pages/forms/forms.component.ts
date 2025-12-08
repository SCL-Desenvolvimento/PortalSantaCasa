import { Component, OnInit } from '@angular/core';
import { FormsService } from '../../core/services/forms.service';
import { FormsResponseDto } from '../../models/forms.model';

interface Formulario {
  icon: string;       // permanece vazio, pois não vem do banco
  title: string;
  description?: string;
  link?: string;
}

@Component({
  selector: 'app-forms',
  standalone: false,
  templateUrl: './forms.component.html',
  styleUrl: './forms.component.css'
})
export class FormsComponent implements OnInit {

  formularios: Formulario[] = [];
  loading: boolean = false;
  errorMessage: string | null = null;

  constructor(private formsService: FormsService) { }

  ngOnInit(): void {
    this.loadForms();
  }

  private loadForms(): void {
    this.loading = true;
    this.errorMessage = null;

    this.formsService.getAll().subscribe({
      next: (data: FormsResponseDto[]) => {
        this.formularios = data.map(item => ({
          icon: '',               
          title: item.title,
          description: item.description,
          link: item.formsLink
        }));

        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar formulários.';
        this.loading = false;
      }
    });
  }
}
