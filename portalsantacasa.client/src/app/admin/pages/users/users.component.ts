import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/user.model';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  modalTitle = '';
  showModal = false;
  isEdit = false;
  selectedUser: User | null = null;
  userForm: User = this.getEmptyUser();
  imageFile: File | null = null;
  departments: string[] = [
    "Almoxarifado",
    "Ambulatório Convênio",
    "Ambulatório de Oncologia",
    "Ambulatório SUS",
    "Auditoria Enfermagem",
    "Cadastro",
    "Capela",
    "Cardiologia",
    "C.A.S.",
    "Casa de Força",
    "Centro Cirúrgico",
    "Clínica Cirúrgica",
    "Clínica Emília",
    "Clínica Médica",
    "C.M.E.",
    "Compras",
    "Contabilidade",
    "Custo Hospitalar",
    "Emergência PS",
    "Endoscopia",
    "Engenharia Clínica",
    "Exames Análises Clínicas",
    "Exames de Anatomia Patológica",
    "Expansão / Obras",
    "Farmácia",
    "Faturamento",
    "Financeiro",
    "Fisioterapia",
    "Gerador de Energia",
    "Gerência Comercial",
    "Gerência de Processos",
    "Gerência de Enfermagem",
    "HC Especialidades",
    "Hemodinâmica",
    "Hotelaria",
    "Informática",
    "Jurídico",
    "Lactário",
    "Lavanderia",
    "Manutenção",
    "Maternidade SUS",
    "Necrotério",
    "NIR - Núcleo Interno de Regulação",
    "Ortopedia",
    "Patrimônio",
    "Pediatria",
    "Pesquisa e Desenvolvimento",
    "Portarias",
    "Pronto Atendimento",
    "Pronto Socorro Adulto",
    "Pronto Socorro Infantil",
    "Provedoria",
    "Qualidade",
    "Raio-X",
    "Reforma de Ambulatório",
    "Relacionamento Externo",
    "Recursos Humanos (RH)",
    "Sala de Videoconferência",
    "SAME SPP",
    "SCIH",
    "Secretaria",
    "Serviço de Imagem",
    "Serviço de Hemoterapia",
    "Serviço Profissional",
    "Serviço Social",
    "Serviços de Psicologia",
    "SESMT",
    "Setor de Autorização",
    "Setor de Recursos e Glosas",
    "SND - Serviço de Nutrição e Dietética",
    "Superintendência",
    "Suprimentos",
    "Telefonia",
    "Transporte",
    "Usina de Oxigênio",
    "UTI Geral",
    "UTI Neonatal",
    "UTI 01",
    "UTI 02",
    "Zeladoria"
  ];

  constructor(
    private userService: UserService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  private getEmptyUser(): User {
    return {
      id: 0,
      username: '',
      email: '',
      userType: '',
      department: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      photoUrl: ''
    };
  }

  loadUsers(): void {
    this.userService.getUser().subscribe({
      next: (data) => {
        this.users = data.map(user => ({
          ...user,
          photoUrl: `${environment.imageServerUrl}${user.photoUrl}`
        }));
      },
      error: () => this.toastr.error('Erro ao carregar usuários')
    });
  }

  showUserForm(userId?: number): void {
    this.isEdit = !!userId;
    this.modalTitle = this.isEdit ? 'Editar Usuário' : 'Novo Usuário';

    if (userId) {
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.selectedUser = user;
          this.userForm = { ...user, photoUrl: `${environment.imageServerUrl}${user.photoUrl}` };
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar usuário')
      });
    } else {
      this.selectedUser = null;
      this.userForm = this.getEmptyUser();
      this.imageFile = null;
      this.openModal();
    }
  }

  saveUser(): void {
    const formData = new FormData();
    formData.append('username', this.userForm.username.trim());
    formData.append('email', this.userForm.email || '');
    formData.append('userType', this.userForm.userType);
    formData.append('department', this.userForm.department);
    formData.append('isActive', this.userForm.isActive.toString());

    if (!this.isEdit) {
      formData.append('createdAt', new Date().toISOString());
    }

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    const request = this.isEdit && this.selectedUser?.id
      ? this.userService.updateUser(this.selectedUser.id, formData)
      : this.userService.createUser(formData);

    request.subscribe({
      next: () => {
        this.closeModal();
        this.loadUsers();
        this.toastr.success('Usuário salvo com sucesso!');
      },
      error: () => this.toastr.error('Erro ao salvar usuário')
    });
  }

  deleteUser(userId?: number): void {
    if (!userId)
      return;

    Swal.fire({
      title: 'Tem certeza?',
      text: 'Você não poderá reverter esta ação!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.deleteUser(userId).subscribe({
          next: () => {
            this.loadUsers();
            this.toastr.success('Usuário removido com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir usuário')
        });
      }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.imageFile = input.files[0];
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  canSave(): boolean {
    if (this.isEdit) {
      return !!this.userForm.username && !!this.userForm.userType;
    }
    return !!this.userForm.username && !!this.userForm.userType;
  }
}
