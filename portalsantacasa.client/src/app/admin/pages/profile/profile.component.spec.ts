import { beforeEach, describe, expect, it } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../core/services/user.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent password form', () => {
    let fixture: ComponentFixture<ProfileComponent>;
    const user = { id: 1, username: 'administrador', email: '', userType: 'admin',
        department: 'Informática', isActive: true, createdAt: '2026-01-01', photoUrl: '' };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ProfileComponent], imports: [CommonModule, ReactiveFormsModule],
            providers: [
                { provide: UserService, useValue: { getCurrentProfile: () => of(user) } },
                { provide: ToastrService, useValue: {} }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ProfileComponent);
        fixture.detectChanges();
    });

    it('identifies the saved account within the password form without using an unsaved username', () => {
        fixture.componentInstance.profileForm.controls.username.setValue('nome-ainda-nao-salvo');
        fixture.detectChanges();
        const account: HTMLInputElement = fixture.nativeElement.querySelector('#security form input[autocomplete="username"]');
        expect(account.value).toBe('administrador');
        expect(account.name).toBe('username');
        expect(account.hidden).toBe(true);
        expect(account.readOnly).toBe(true);
        expect(account.closest('form')!.querySelector('input[autocomplete="current-password"]')).not.toBeNull();
    });
});
