// feedback-modal.component.ts
import { Component, OnInit } from '@angular/core';
import { FeedbackService } from '../../services/feedbacks.service';
import { Feedback } from '../../models/feedback.model';

@Component({
  selector: 'app-feedback-modal',
  standalone: false,
  templateUrl: './feedback-modal.component.html',
  styleUrls: ['./feedback-modal.component.css']
})
export class FeedbackModalComponent implements OnInit {
  isOpen = false;

  feedback: Feedback = this.resetFeedbackModal();

  // Departamentos
  departments: string[] = [
    "Almoxarifado", "Ambulatório Convênio", "Ambulatório de Oncologia", "Ambulatório SUS",
    "Auditoria Enfermagem", "Cadastro", "Capela", "Cardiologia", "C.A.S.", "Casa de Força",
    "Centro Cirúrgico", "Clínica Cirúrgica", "Clínica Emília", "Clínica Médica", "C.M.E.",
    "Compras", "Contabilidade", "Custo Hospitalar", "Emergência PS", "Endoscopia",
    "Engenharia Clínica", "Exames Análises Clínicas", "Exames de Anatomia Patológica",
    "Expansão / Obras", "Farmácia", "Faturamento", "Financeiro", "Fisioterapia",
    "Gerador de Energia", "Gerência Comercial", "Gerência de Processos", "Gerência de Enfermagem",
    "HC Especialidades", "Hemodinâmica", "Hotelaria", "Informática", "Jurídico", "Lactário",
    "Lavanderia", "Manutenção", "Maternidade SUS", "Necrotério", "NIR - Núcleo Interno de Regulação",
    "Ortopedia", "Patrimônio", "Pediatria", "Pesquisa e Desenvolvimento", "Portarias",
    "Pronto Atendimento", "Pronto Socorro Adulto", "Pronto Socorro Infantil", "Provedoria",
    "Qualidade", "Raio-X", "Reforma de Ambulatório", "Relacionamento Externo",
    "Recursos Humanos (RH)", "Sala de Videoconferência", "SAME SPP", "SCIH", "Secretaria",
    "Serviço de Imagem", "Serviço de Hemoterapia", "Serviço Profissional", "Serviço Social",
    "Serviços de Psicologia", "SESMT", "Setor de Autorização", "Setor de Recursos e Glosas",
    "SND - Serviço de Nutrição e Dietética", "Superintendência", "Suprimentos", "Telefonia",
    "Transporte", "Usina de Oxigênio", "UTI Geral", "UTI Neonatal", "UTI 01", "UTI 02", "Zeladoria"
  ];

  departmentsTarget: string[] = ["Informática"];

  constructor(private feedbackModalService: FeedbackService) { }

  ngOnInit(): void {
    this.feedbackModalService.modalState$.subscribe(state => {
      this.isOpen = state;
    });
  }

  close() {
    console.log(this.isOpen)

    this.feedbackModalService.close();
  }

  sendFeedback(): void {
    // Validação básica
    if (!this.feedback.name || !this.feedback.department || !this.feedback.category ||
      !this.feedback.targetDepartment || !this.feedback.subject || !this.feedback.message) {
      console.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const formData = new FormData();
    formData.append('name', this.feedback.name);
    formData.append('message', this.feedback.message);
    formData.append('email', this.feedback.email || '');
    formData.append('department', this.feedback.department || '');
    formData.append('targetDepartment', this.feedback.targetDepartment || '');
    formData.append('category', this.feedback.category);
    formData.append('subject', this.feedback.subject);

    this.feedbackModalService.createFeedback(formData).subscribe({
      next: (data) => {
        this.close();
        console.log('Feedback enviado com sucesso!');
      },
      error: (error) => {
        console.error('Erro ao enviar feedback', error);
      }
    });
  }

  resetFeedbackModal(): Feedback {
    return {
      name: '',
      email: '',
      department: '',
      category: '',
      targetDepartment: '',
      subject: '',
      message: '',
      isRead: false,
      createdAt: ''
    };
  }

}
