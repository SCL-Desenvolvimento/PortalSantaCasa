import { Component, OnInit } from '@angular/core';

// Interface para definir a estrutura de um formulário
interface Formulario {
  icon: string;
  title: string;
  description: string;
  link: string;
}
@Component({
  selector: 'app-forms',
  standalone: false,
  templateUrl: './forms.component.html',
  styleUrl: './forms.component.css'
})
export class FormsComponent implements OnInit {

  // Lista de formulários a serem exibidos na tela
  // Para adicionar um novo, basta criar um novo objeto neste array.
  formularios: Formulario[] = [
    {
      icon: '📝',
      title: 'Comunicação de Acidente',
      description: 'Use este formulário para registrar acidentes ocorridos durante o horário de trabalho.',
      link: 'https://link-do-seu-forms-de-acidente'
    },
    {
      icon: '📣',
      title: 'Canal de Denúncias',
      description: 'Utilize este canal para fazer denúncias anônimas ou identificadas com segurança e sigilo.',
      link: 'https://link-do-seu-forms-de-denuncia'
    },
    {
      icon: '⚠️',
      title: 'Registro de Incidente',
      description: 'Reporte incidentes de segurança da informação, problemas operacionais ou falhas de TI.',
      link: 'https://link-do-seu-forms-de-incidente'
    },
    {
      icon: '💡',
      title: 'Sugestões de Melhoria',
      description: 'Envie suas ideias e sugestões para melhorar nossos processos, produtos e ambiente de trabalho.',
      link: 'https://link-do-seu-forms-de-sugestoes'
    }
  ];

  constructor() { }

  ngOnInit(): void {
    // Lógica adicional pode ser inserida aqui, se necessário.
  }

}
