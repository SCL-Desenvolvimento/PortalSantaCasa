import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { DiagnosticoService, DiagnosticoRelacionamento, DiagnosticoRequest } from '../../../core/services/diagnostico.service';

@Component({
  selector: 'app-diagnostico',
  standalone: false,
  templateUrl: './diagnostico.component.html',
  styleUrl: './diagnostico.component.css',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DiagnosticoComponent {

  cidInput = '';
  regime: 'SUS' | 'CONVENIO' = 'SUS';

  resultado: DiagnosticoRelacionamento | null = null;
  loading = false;
  error: string | null = null;

  constructor(private diagnosticoService: DiagnosticoService) { }

  processarDiagnostico() {
    if (!this.cidInput) {
      this.error = 'Informe um código CID-10.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.resultado = null;

    const request: DiagnosticoRequest = {
      cidCodigo: this.cidInput,
      regime: this.regime
    };

    this.diagnosticoService.processarDiagnostico(request).subscribe({
      next: (data) => {
        this.resultado = data;
        this.loading = false;
      },
      error: () => {
        this.error = `Erro ao processar o diagnóstico para o regime ${this.regime === 'SUS' ? 'SUS' : 'Convênio'
          }.`;
        this.loading = false;
      }
    });
  }
}
