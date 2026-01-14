import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Cid10 {
  codigo: string;
  descricao: string;
}

export interface Procedimento {
  codigo: string;
  descricao: string;
  tabela: string;
  valor: number;
  unidade: string;
}

export interface DiagnosticoRequest {
  cidCodigo: string;
  regime: string; // SUS | CONVENIO
}

export interface DiagnosticoRelacionamento {
  hipoteseDiagnostica: Cid10;
  procedimentos: Procedimento[];
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticoService {
  private apiUrl = `${environment.apiUrl}/Diagnostico`;

  constructor(private http: HttpClient) { }

  processarDiagnostico(request: DiagnosticoRequest): Observable<DiagnosticoRelacionamento> {
    return this.http.post<DiagnosticoRelacionamento>(`${this.apiUrl}/processar`, request);
  }

  importarSigtap(files: File[]): Observable<void> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<void>(`${environment.apiUrl}/sigtap/importar`, formData);
  }

  importarDepara(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<void>(`${environment.apiUrl}/tuss-depara/importar`, formData);
  }

  importarTussValues(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<void>(`${environment.apiUrl}/tuss-depara/importar-tuss-values`, formData);
  }
}
