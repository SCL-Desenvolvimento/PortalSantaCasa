import { beforeEach, describe, expect, it } from "vitest";
import { ComponentTestModule } from '../../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSidebarComponent } from './admin-sidebar.component';

describe('AdminSidebarComponent', () => {
    let component: AdminSidebarComponent;
    let fixture: ComponentFixture<AdminSidebarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [AdminSidebarComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(AdminSidebarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
