import { beforeEach, describe, expect, it } from "vitest";
import { PublicAccessLogModalComponent } from '../../shared/components/public-access-log-modal/public-access-log-modal.component';
import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalAnnouncementDetailComponent } from './internal-announcement-detail.component';

describe('InternalAnnouncementDetailComponent', () => {
    let component: InternalAnnouncementDetailComponent;
    let fixture: ComponentFixture<InternalAnnouncementDetailComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [InternalAnnouncementDetailComponent, PublicAccessLogModalComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(InternalAnnouncementDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
