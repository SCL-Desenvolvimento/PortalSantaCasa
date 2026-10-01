import { Component, OnInit } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { MenuService } from "../../../core/services/menu.service";
import { Menu } from "../../../models/menu.model";
import Swal from 'sweetalert2/dist/sweetalert2.esm.all.js';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  // =====================
  // 📌 Dados principais
  // =====================
  menuItemsList: Menu[] = [];
  filteredMenuItems: Menu[] = [];

  totalMenuItems = 0;
  uniqueDays = 0;
  remainingDays = 0;

  // Filtros e busca
  searchTerm = '';
  dayFilter: string = 'all';

  // Modal
  modalTitle = '';
  showModal = false;
  isEdit = false;
  isLoading = false;

  // Dados do formulário
  selectedMenu: Menu | null = null;
  menuFormData: Menu = this.getEmptyMenu();
  imageFile: File | null = null;

  diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  diasComItens: string[] = [];

  constructor(private menuService: MenuService, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.loadMenuItems();
  }

  private getEmptyMenu(): Menu {
    return { id: 0, diaDaSemana: '', titulo: '', descricao: '', imagemUrl: '' };
  }

  // =====================
  // 📌 CRUD
  // =====================
  loadMenuItems(): void {
    this.menuService.getMenu().subscribe({
      next: (data) => {
        this.menuItemsList = data.map((menu) => ({
          ...menu,
          imagemUrl: menu.imagemUrl ? `${environment.serverUrl}${menu.imagemUrl}` : ''
        }));

        this.updateStatistics();
        this.applyFilters();
      },
      error: () => this.toastr.error('Erro ao carregar cardápio')
    });
  }

  private updateStatistics(): void {
    this.totalMenuItems = this.menuItemsList.length;

    // Dias únicos com itens cadastrados
    const diasUnicos = new Set(this.menuItemsList.map(item => item.diaDaSemana));
    this.uniqueDays = diasUnicos.size;
    this.diasComItens = Array.from(diasUnicos);

    // Dias restantes para completar a semana
    this.remainingDays = 7 - this.uniqueDays;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.imageFile = input.files[0];
    }
  }

  saveMenu(): void {
    if (!this.canSave()) return;

    this.isLoading = true;

    const formData = new FormData();
    formData.append('titulo', this.menuFormData.titulo);
    formData.append('descricao', this.menuFormData.descricao);
    formData.append('diaDaSemana', this.menuFormData.diaDaSemana);

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    const request = this.isEdit && this.selectedMenu?.id
      ? this.menuService.updateMenu(this.selectedMenu.id, formData)
      : this.menuService.createMenu(formData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
        this.loadMenuItems();
        this.toastr.success('Cardápio salvo com sucesso!');
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erro ao salvar cardápio');
      }
    });
  }

  deleteMenu(menuId: number | undefined): void {
    if (!menuId) return;

    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.menuService.deleteMenu(menuId).subscribe({
          next: () => {
            this.loadMenuItems();
            this.toastr.success('Cardápio removido com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir cardápio')
        });
      }
    });
  }

  // =====================
  // 📌 Modal
  // =====================
  openMenuForm(menuId?: number): void {
    this.isEdit = !!menuId;
    this.modalTitle = this.isEdit ? 'Editar Item do Cardápio' : 'Novo Item do Cardápio';

    if (menuId) {
      this.menuService.getMenuById(menuId).subscribe({
        next: (menu) => {
          this.selectedMenu = menu;
          this.menuFormData = {
            ...menu,
            imagemUrl: menu.imagemUrl ? `${environment.serverUrl}${menu.imagemUrl}` : ''
          };
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar cardápio')
      });
    } else {
      this.selectedMenu = null;
      this.menuFormData = this.getEmptyMenu();
      this.imageFile = null;
      this.openModal();
    }
  }

  openMenuFormForDay(dia: string): void {
    this.isEdit = false;
    this.modalTitle = `Novo Item para ${dia}`;
    this.selectedMenu = null;
    this.menuFormData = this.getEmptyMenu();
    this.menuFormData.diaDaSemana = dia; // Pré-seleciona o dia
    this.imageFile = null;
    this.openModal();
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.menuFormData = this.getEmptyMenu();
    this.selectedMenu = null;
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

  setDayFilter(day: string): void {
    this.dayFilter = day;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredMenuItems = this.menuItemsList.filter(item => {
      const matchesSearch =
        !this.searchTerm ||
        item.titulo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.diaDaSemana.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesDay =
        this.dayFilter === 'all' ||
        item.diaDaSemana === this.dayFilter;

      return matchesSearch && matchesDay;
    });

    // Ordenar por dia da semana
    this.filteredMenuItems.sort((a, b) =>
      this.diasDaSemana.indexOf(a.diaDaSemana) - this.diasDaSemana.indexOf(b.diaDaSemana)
    );
  }

  // =====================
  // 📌 Helpers para visão geral da semana
  // =====================
  hasMenuForDay(dia: string): boolean {
    return this.menuItemsList.some(item => item.diaDaSemana === dia);
  }

  getMenuItemsForDay(dia: string): Menu[] {
    return this.menuItemsList.filter(item => item.diaDaSemana === dia);
  }

  // =====================
  // 📌 Helpers gerais
  // =====================
  canSave(): boolean {
    if (this.isEdit) {
      return !!this.menuFormData.imagemUrl || !!this.imageFile;
    }
    return !!this.imageFile;
  }

  // Getter para acessar menuItems no template (compatibilidade)
  get menuItems(): Menu[] {
    return this.menuItemsList;
  }
}

