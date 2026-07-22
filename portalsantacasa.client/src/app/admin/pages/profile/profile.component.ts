import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../models/user.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastr = inject(ToastrService);
  private readonly destroy$ = new Subject<void>();
  private previewObjectUrl?: string;

  user?: User;
  selectedPhoto?: File;
  photoPreview = '';
  isLoading = true;
  isSavingProfile = false;
  isChangingPassword = false;
  showCurrentPassword = false;
  showNewPassword = false;

  readonly profileForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.email, Validators.maxLength(180)]]
  });

  readonly passwordForm = this.formBuilder.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.releasePreviewUrl();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.userService.getCurrentProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: user => {
          this.user = user;
          this.profileForm.reset({ username: user.username, email: user.email ?? '' });
          this.photoPreview = this.resolvePhotoUrl(user.photoUrl);
          this.selectedPhoto = undefined;
          this.isLoading = false;
        },
        error: error => {
          this.toastr.error(error.message, 'Não foi possível carregar o perfil');
          this.isLoading = false;
        }
      });
  }

  selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Selecione um arquivo de imagem válido.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toastr.warning('A foto deve ter no máximo 10 MB.');
      return;
    }

    this.releasePreviewUrl();
    this.selectedPhoto = file;
    this.previewObjectUrl = URL.createObjectURL(file);
    this.photoPreview = this.previewObjectUrl;
    this.profileForm.markAsDirty();
  }

  cancelPhoto(): void {
    this.releasePreviewUrl();
    this.selectedPhoto = undefined;
    this.photoPreview = this.resolvePhotoUrl(this.user?.photoUrl);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    formData.append('username', this.profileForm.controls.username.value.trim());
    formData.append('email', this.profileForm.controls.email.value.trim());
    if (this.selectedPhoto) formData.append('file', this.selectedPhoto, this.selectedPhoto.name);

    this.isSavingProfile = true;
    this.userService.updateCurrentProfile(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: user => {
          this.user = user;
          this.profileForm.reset({ username: user.username, email: user.email ?? '' });
          this.releasePreviewUrl();
          this.selectedPhoto = undefined;
          this.photoPreview = this.resolvePhotoUrl(user.photoUrl);
          this.isSavingProfile = false;
          this.toastr.success('Perfil atualizado com sucesso.');
        },
        error: error => {
          this.isSavingProfile = false;
          this.toastr.error(error.message, 'Erro ao salvar o perfil');
        }
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.passwordsDoNotMatch) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.isChangingPassword = true;
    this.userService.changeOwnPassword(currentPassword, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.passwordForm.reset();
          this.isChangingPassword = false;
          this.toastr.success(response.message);
        },
        error: error => {
          this.isChangingPassword = false;
          this.toastr.error(error.message, 'Não foi possível alterar a senha');
        }
      });
  }

  get passwordsDoNotMatch(): boolean {
    const form = this.passwordForm.controls;
    return !!form.confirmPassword.value && form.newPassword.value !== form.confirmPassword.value;
  }

  get roleLabel(): string {
    const labels: Record<string, string> = {
      superadmin: 'Super Administrador', admin: 'Administrador', editor: 'Editor',
      viewer: 'Visualizador', manager: 'Gerente', employee: 'Funcionário'
    };
    return labels[this.user?.userType?.toLowerCase() ?? ''] ?? this.user?.userType ?? '-';
  }

  get initials(): string {
    return (this.user?.username ?? 'U').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  private resolvePhotoUrl(photoUrl?: string): string {
    if (!photoUrl || photoUrl.endsWith('default-user.png')) return '';
    return photoUrl.startsWith('http') ? photoUrl : `${environment.serverUrl}${photoUrl}`;
  }

  private releasePreviewUrl(): void {
    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = undefined;
  }
}
