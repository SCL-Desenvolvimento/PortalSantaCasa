import { beforeEach, describe, expect, it } from "vitest";
import { ComponentTestModule } from '../../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminFooterComponent } from './admin-footer.component';

describe('AdminFooterComponent', () => {
    let component: AdminFooterComponent;
    let fixture: ComponentFixture<AdminFooterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [AdminFooterComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(AdminFooterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
