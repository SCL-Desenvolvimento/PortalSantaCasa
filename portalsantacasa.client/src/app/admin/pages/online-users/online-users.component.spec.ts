import { beforeEach, describe, expect, it } from "vitest";
import { ComponentTestModule } from '../../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnlineUsersComponent } from './online-users.component';

describe('OnlineUsersComponent', () => {
    let component: OnlineUsersComponent;
    let fixture: ComponentFixture<OnlineUsersComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [OnlineUsersComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(OnlineUsersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
