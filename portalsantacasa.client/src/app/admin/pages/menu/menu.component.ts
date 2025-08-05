import { Component, OnInit } from '@angular/core';
import { MenuService } from '../../../services/menu.service';
import { Menu } from '../../../models/menu.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  menuItems: Menu[] = [];
  message: { text: string, type: string } | null = null;
  showModal = false;
  isEdit = false;
  menuFormData: Menu = { diaDaSemana: '', titulo: '', descricao: '', imagemUrl: '' };
  diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  modalTitle: string = '';
  selectedMenu: Menu | null = null;
  imageFile: File | null = null;


  constructor(private menuService: MenuService) { }

  ngOnInit(): void {
    this.loadMenuAdmin();
  }

  loadMenuAdmin(): void {
    this.menuService.getMenu().subscribe({
      next: (data) => {
        this.menuItems = data.map((menu) => ({
          id: menu.id,
          descricao: menu.descricao,
          diaDaSemana: menu.diaDaSemana,
          imagemUrl: `${environment.imageServerUrl}${menu.imagemUrl}`,
          titulo: menu.titulo
        }))
      },
      error: (err) => {
        this.showMessage('Erro ao carregar cardápio', 'error')
      }
    });
  }

  showMenuManagement(menuId: number | null = null): void {
    this.isEdit = menuId !== null;
    this.modalTitle = this.isEdit ? 'Editar cardápio' : 'Nova cardápio';
    if (menuId) {
      this.menuService.getMenuById(menuId).subscribe({
        next: (menu) => {
          this.selectedMenu = menu;
          this.menuFormData = { ...menu, imagemUrl: `${environment.imageServerUrl}${menu.imagemUrl}` };
          this.openModal();
        },
        error: (error) => {
          this.showMessage(`Erro ao carregar cardápio: ${error.message}`, 'error');
        }
      });
    } else {
      this.selectedMenu = null;
      this.menuFormData = { diaDaSemana: '', titulo: '', descricao: '', imagemUrl: '' };
      this.imageFile = null;
      this.openModal();
    }
  }

  saveMenu(): void {
    const formData = new FormData();
    formData.append('titulo', this.menuFormData.titulo);
    formData.append('descricao', this.menuFormData.descricao || '');
    formData.append('diaDaSemana', this.menuFormData.diaDaSemana);
    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    this.submitMenuForm(formData);
  }

  submitMenuForm(formData: FormData): void {
    const request = this.isEdit && this.selectedMenu?.id
      ? this.menuService.updateMenu(this.selectedMenu.id, formData)
      : this.menuService.createMenu(formData);
    request.subscribe({
      next: (data) => {
        this.closeModal();
        //this.showMessage(data.message, 'success');
        this.loadMenuAdmin();
      },
      error: (error) => {
        this.showMessage(error.message || 'Erro ao salvar cardápio', 'error');
      }
    });
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  editMenu(item: Menu): void {
    this.menuFormData = { ...item };
    this.isEdit = true;
    this.showModal = true;
  }

  deleteMenu(menuId?: number): void {
    if (!menuId) {
      console.warn('ID inválido ao tentar deletar cardápio.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir esta cardápio?')) {
      this.menuService.deleteMenu(menuId).subscribe({
        next: (data) => {
          console.log(data);
          //this.showMessage(data.message, 'success');
          this.loadMenuAdmin();
        },
        error: (error) => {
          this.showMessage(error.message || 'Erro ao excluir cardápio', 'error');
        }
      });
    }
  }

  onFileChange(event: Event, type: 'image' | 'document' | 'photo'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      if (type === 'image') {
        this.imageFile = input.files[0];
      }
    }
  }
  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => (this.message = null), 3000);
  }
}
