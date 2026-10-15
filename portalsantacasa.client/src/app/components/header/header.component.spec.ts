import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [HeaderComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    afterEach(() => {
        component.closeMobileMenu();
        vi.unstubAllGlobals();
    });

    it('keeps the drawer open when resizing within the tablet layout', () => {
        vi.stubGlobal('innerWidth', 1024);
        component.toggleMobileMenu();
        component.onResize(new Event('resize'));
        expect(component.mobileMenuOpen).toBe(true);
        expect(document.body.style.overflow).toBe('hidden');
    });

    it('closes the drawer and restores scrolling when returning to desktop', () => {
        vi.stubGlobal('innerWidth', 1440);
        component.toggleMobileMenu();
        component.onResize(new Event('resize'));
        expect(component.mobileMenuOpen).toBe(false);
        expect(document.body.style.overflow).toBe('');
    });

    it('closes the drawer after selecting a navigation destination', () => {
        vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        component.toggleMobileMenu();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('a[href="/comunicados"]').click();
        expect(component.mobileMenuOpen).toBe(false);
        expect(document.body.style.overflow).toBe('');
    });

    it('moves focus into the drawer and restores it after closing', async () => {
        component.toggleMobileMenu();
        fixture.detectChanges();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.nav-close'));
        component.closeMobileMenu();
        expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.mobile-menu-toggle'));
    });

    it('keeps Shift+Tab inside the open drawer', () => {
        component.toggleMobileMenu();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.nav-close').focus();
        const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
        component.handleKeyboardShortcut(event);
        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.btn-login-mobile'));
    });
});
