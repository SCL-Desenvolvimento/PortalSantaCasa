import { Component } from '@angular/core';
import { DiagnosticoService } from '../../../core/services/diagnostico.service';

@Component({
  selector: 'app-atualizacao-arquivos',
  standalone: false,
  templateUrl: './atualizacao-arquivos.component.html',
  styleUrls: ['./atualizacao-arquivos.component.css']
})
export class AtualizacaoArquivosComponent {

  selectedSigtapFiles: File[] = [];
  selectedDeparaFile: File | null = null;

  loadingSigtap = false;
  loadingDepara = false;

  message = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(
    private atualizacaoService: DiagnosticoService
  ) { }

  onSigtapFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedSigtapFiles = Array.from(input.files);
    }
  }

  onDeparaFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedDeparaFile = input.files ? input.files[0] : null;
  }

  uploadSigtap() {
    if (!this.selectedSigtapFiles.length) return;

    this.loadingSigtap = true;

    this.atualizacaoService.importarSigtap(this.selectedSigtapFiles)
      .subscribe({
        next: () => {
          this.showMessage('Tabela SIGTAP atualizada com sucesso!', 'success');
          this.selectedSigtapFiles = [];
          this.loadingSigtap = false;
        },
        error: err => {
          this.showMessage('Erro ao atualizar SIGTAP: ' + err.message, 'error');
          this.loadingSigtap = false;
        }
      });
  }

  uploadDepara() {
    if (!this.selectedDeparaFile) return;

    this.loadingDepara = true;

    this.atualizacaoService.importarDepara(this.selectedDeparaFile)
      .subscribe({
        next: () => {
          this.showMessage('Tabela DE-PARA TUSS atualizada com sucesso!', 'success');
          this.selectedDeparaFile = null;
          this.loadingDepara = false;
        },
        error: err => {
          this.showMessage('Erro ao atualizar DE-PARA: ' + err.message, 'error');
          this.loadingDepara = false;
        }
      });
  }

  private showMessage(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;

    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 5000);
  }
}
