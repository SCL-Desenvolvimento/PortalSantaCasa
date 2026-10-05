import { beforeEach, describe, expect, it } from "vitest";
import { ComponentTestModule } from '../../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackModalComponent } from './feedback-modal.component';

describe('FeedbackModalComponent', () => {
    let component: FeedbackModalComponent;
    let fixture: ComponentFixture<FeedbackModalComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [FeedbackModalComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(FeedbackModalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
