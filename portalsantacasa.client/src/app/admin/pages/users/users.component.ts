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
  // =====================
  // 📌 Dados principais
  // =====================
  usersList: User[] = [];
  filteredUsers: User[] = [];

  totalUsers = 0;
  activeUsers = 0;
  inactiveUsers = 0;

  // Filtros e busca
  searchTerm = '';
  statusFilter: boolean | null = null; // null: todos, true: ativos, false: inativos

  // Modal
  modalTitle = '';
  showModal = false;
  isEdit = false;
  isLoading = false;

  // Dados do formulário
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

  // Paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

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

  // =====================
  // 📌 CRUD e Carregamento
  // =====================
  loadUsers(page: number = 1): void {
    this.userService.getUsersPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.usersList = data.users.map(user => ({
          ...user,
          photoUrl: user.photoUrl ? `${environment.imageServerUrl}${user.photoUrl}` : ''
        }));

        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.updateStatistics();
        this.applyFilters();
      },
      error: () => this.toastr.error('Erro ao carregar usuários')
    });
  }

  private updateStatistics(): void {
    this.totalUsers = this.usersList.length;
    this.activeUsers = this.usersList.filter(user => user.isActive).length;
    this.inactiveUsers = this.totalUsers - this.activeUsers;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.imageFile = input.files[0];
    }
  }

  saveUser(): void {
    if (!this.canSave()) return;

    this.isLoading = true;

    const formData = new FormData();
    formData.append('username', this.userForm.username.trim());
    formData.append('email', this.userForm.email || '');
    formData.append('userType', this.userForm.userType);
    formData.append('department', this.userForm.department);
    formData.append('isActive', String(this.userForm.isActive));

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
        this.isLoading = false;
        this.closeModal();
        this.loadUsers();
        this.toastr.success('Usuário salvo com sucesso!');
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erro ao salvar usuário');
      }
    });
  }

  deleteUser(userId?: number): void {
    if (!userId) return;

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

  resetPassword(userId?: number): void {
    if (!userId) return;

    Swal.fire({
      title: 'Resetar senha?',
      text: 'A senha será redefinida para o padrão: 123456',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, resetar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.resetPassword(userId).subscribe({
          next: () => {
            this.toastr.success('Senha resetada para o padrão!');
          },
          error: () => this.toastr.error('Erro ao resetar senha')
        });
      }
    });
  }

  toggleUserStatus(user: User): void {
    if (!user.id) return;

    const formData = new FormData();
    formData.append('username', user.username.trim());
    formData.append('email', user.email || '');
    formData.append('userType', user.userType);
    formData.append('department', user.department);
    formData.append('isActive', String(!user.isActive));

    this.userService.updateUser(user.id, formData).subscribe({
      next: () => {
        user.isActive = !user.isActive;
        this.updateStatistics();
        this.applyFilters();
        this.toastr.success(`Usuário ${!user.isActive ? 'ativado' : 'desativado'} com sucesso!`);
      },
      error: () => this.toastr.error('Erro ao atualizar status do usuário')
    });
  }

  // =====================
  // 📌 Modal
  // =====================
  showUserForm(userId?: number): void {
    this.isEdit = !!userId;
    this.modalTitle = this.isEdit ? 'Editar Usuário' : 'Novo Usuário';

    if (userId) {
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.selectedUser = user;
          this.userForm = { ...user, photoUrl: user.photoUrl ? `${environment.imageServerUrl}${user.photoUrl}` : '' };
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

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.userForm = this.getEmptyUser();
    this.selectedUser = null;
    this.isEdit = false;
    this.isLoading = false;
    this.imageFile = null;
  }

  // =====================
  // 📌 Busca e filtros
  // =====================
  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(status: boolean | null): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredUsers = this.usersList.filter(user => {
      const matchesSearch =
        !this.searchTerm ||
        user.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user?.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.userType.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.statusFilter === null ||
        user.isActive === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  // =====================
  // 📌 Paginação
  // =====================
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadUsers(page);
    }
  }

  // =====================
  // 📌 Helpers gerais
  // =====================
  canSave(): boolean {
    return !!this.userForm.username && !!this.userForm.email && !!this.userForm.userType && !!this.userForm.department;
  }
}


