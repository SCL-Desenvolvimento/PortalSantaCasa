import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserPreferences {
  sidebarCollapsed: boolean;
  showBreadcrumb: boolean;
  compactMode: boolean;
  reduceMotion: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  sidebarCollapsed: false,
  showBreadcrumb: true,
  compactMode: false,
  reduceMotion: false
};

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly storageKey = 'admin-preferences';
  private readonly preferencesSubject = new BehaviorSubject<UserPreferences>(this.load());
  readonly preferences$ = this.preferencesSubject.asObservable();

  constructor() {
    this.apply(this.preferencesSubject.value);
  }

  get current(): UserPreferences {
    return this.preferencesSubject.value;
  }

  update(changes: Partial<UserPreferences>): void {
    const preferences = { ...this.current, ...changes };
    localStorage.setItem(this.storageKey, JSON.stringify(preferences));
    localStorage.setItem('sidebar-collapsed', String(preferences.sidebarCollapsed));
    localStorage.setItem('show-breadcrumb', String(preferences.showBreadcrumb));
    this.apply(preferences);
    this.preferencesSubject.next(preferences);
  }

  reset(): void {
    localStorage.removeItem(this.storageKey);
    this.update(DEFAULT_PREFERENCES);
  }

  private load(): UserPreferences {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? '{}') as Partial<UserPreferences>;
      return {
        ...DEFAULT_PREFERENCES,
        sidebarCollapsed: saved.sidebarCollapsed ?? localStorage.getItem('sidebar-collapsed') === 'true',
        showBreadcrumb: saved.showBreadcrumb ?? localStorage.getItem('show-breadcrumb') !== 'false',
        compactMode: saved.compactMode ?? false,
        reduceMotion: saved.reduceMotion ?? false
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  private apply(preferences: UserPreferences): void {
    document.documentElement.classList.toggle('admin-compact-mode', preferences.compactMode);
    document.documentElement.classList.toggle('admin-reduce-motion', preferences.reduceMotion);
  }
}
