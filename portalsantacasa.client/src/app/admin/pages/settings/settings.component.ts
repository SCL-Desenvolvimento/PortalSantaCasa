import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserPreferencesService } from '../../../core/services/user-preferences.service';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly preferences = inject(UserPreferencesService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  readonly settingsForm = this.formBuilder.nonNullable.group({
    sidebarCollapsed: this.preferences.current.sidebarCollapsed,
    showBreadcrumb: this.preferences.current.showBreadcrumb,
    compactMode: this.preferences.current.compactMode,
    reduceMotion: this.preferences.current.reduceMotion
  });

  save(): void {
    this.preferences.update(this.settingsForm.getRawValue());
    this.settingsForm.markAsPristine();
    this.toastr.success('Configurações salvas neste dispositivo.');
  }

  reset(): void {
    this.preferences.reset();
    this.settingsForm.reset(this.preferences.current);
    this.toastr.info('Configurações restauradas para o padrão.');
  }

  openSecurity(): void {
    void this.router.navigate(['/admin/profile'], { fragment: 'security' });
  }

  get browserLabel(): string {
    const agent = navigator.userAgent;
    if (agent.includes('Edg/')) return 'Microsoft Edge';
    if (agent.includes('Chrome/')) return 'Google Chrome';
    if (agent.includes('Firefox/')) return 'Mozilla Firefox';
    if (agent.includes('Safari/')) return 'Safari';
    return 'Navegador atual';
  }

  get platformLabel(): string {
    const browserNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
    return browserNavigator.userAgentData?.platform || navigator.platform || 'Dispositivo atual';
  }
}
