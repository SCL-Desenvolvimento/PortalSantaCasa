import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { Menu } from '../../../models/menu.model';

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
  menuFormData: Menu = {
    id: 0,
    diaDaSemana: '',
    titulo: '',
    descricao: '',
    imagemUrl: ''
  };

  diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadMenuAdmin();
  }

  loadMenuAdmin(): void {
    // this.adminService.getMenu().subscribe({
    //   next: (data) => this.menuItems = data,
    //   error: (err) => this.showMessage('Erro ao carregar cardápio', 'error')
    // });
  }

  showMenuManagement(): void {
    this.resetForm();
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

  deleteMenu(id: number): void {
    if (confirm('Tem certeza que deseja excluir este cardápio?')) {
      this.menuItems = this.menuItems.filter(item => item.id !== id);
      this.showMessage('Cardápio removido com sucesso.', 'success');
    }
  }
  resetForm(): void {
    this.isEdit = false;
    this.menuFormData = {
      id: 0,
      diaDaSemana: '',
      titulo: '',
      descricao: '',
      imagemUrl: ''
    };
  }

  saveMenu(): void {
    // Simulação: ajuste depois para usar o AdminService
    if (!this.menuFormData.id) {
      this.menuItems.push({ ...this.menuFormData, id: Date.now() });
      this.showMessage('Cardápio criado com sucesso!', 'success');
    } else {
      // Edição
      const index = this.menuItems.findIndex(m => m.id === this.menuFormData.id);
      if (index > -1) this.menuItems[index] = { ...this.menuFormData };
      this.showMessage('Cardápio atualizado com sucesso!', 'success');
    }

    this.closeModal();
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => (this.message = null), 3000);
  }
}
