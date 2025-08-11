import { Component, OnInit } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { MenuService } from "../../../services/menu.service";
import { Menu } from "../../../models/menu.model";
import Swal from "sweetalert2";

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  menuItems: Menu[] = [];
  showModal = false;
  isEdit = false;
  menuFormData: Menu = this.getEmptyMenu();
  diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  modalTitle = '';
  selectedMenu: Menu | null = null;
  imageFile: File | null = null;

  constructor(private menuService: MenuService) { }

  ngOnInit(): void {
    this.loadMenuItems();
  }

  getEmptyMenu(): Menu {
    return { id: 0, diaDaSemana: '', titulo: '', descricao: '', imagemUrl: '' };
  }

  loadMenuItems(): void {
    this.menuService.getMenu().subscribe({
      next: (data) => {
        this.menuItems = data.map((menu) => ({
          ...menu,
          imagemUrl: `${environment.imageServerUrl}${menu.imagemUrl}`,
        }));
      },
      error: () => console.error('Erro ao carregar cardápio.'),
    });
  }

  openMenuForm(menuId: number | null = null): void {
    this.isEdit = !!menuId;
    this.modalTitle = this.isEdit ? 'Editar Cardápio' : 'Novo Cardápio';
    if (menuId) {
      this.menuService.getMenuById(menuId).subscribe({
        next: (menu) => {
          this.selectedMenu = menu;
          this.menuFormData = { ...menu, imagemUrl: `${environment.imageServerUrl}${menu.imagemUrl}` };
          this.showModal = true;
        },
        error: () => console.error('Erro ao carregar cardápio.'),
      });
    } else {
      this.menuFormData = this.getEmptyMenu();
      this.imageFile = null;
      this.showModal = true;
    }
  }

  saveMenu(): void {
    if (!this.canSave()) return;

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
        this.showModal = false;
        this.loadMenuItems();
      },
      error: () => console.error('Erro ao salvar cardápio.'),
    });
  }

  deleteMenu(menuId: number | undefined): void {
    if (!menuId)
      return;

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
          next: () => this.loadMenuItems(),
          error: () => console.error('Erro ao excluir cardápio.'),
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

  canSave(): boolean {
    if (this.isEdit) {
      return !!this.menuFormData.imagemUrl || !!this.imageFile;
    }
    return !!this.imageFile;
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }
}
