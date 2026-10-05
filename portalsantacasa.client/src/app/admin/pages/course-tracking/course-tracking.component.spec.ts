import { beforeEach, describe, expect, it } from "vitest";
import { ComponentTestModule } from '../../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseTrackingComponent } from './course-tracking.component';

describe('CourseTrackingComponent', () => {
    let component: CourseTrackingComponent;
    let fixture: ComponentFixture<CourseTrackingComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [CourseTrackingComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(CourseTrackingComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
