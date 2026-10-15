import { beforeEach, describe, expect, it } from "vitest";
import { ComponentTestModule } from '../../../testing/component-test.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderNodeComponent } from './folder-node.component';

describe('FolderNodeComponent', () => {
    let component: FolderNodeComponent;
    let fixture: ComponentFixture<FolderNodeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentTestModule],
            declarations: [FolderNodeComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(FolderNodeComponent);
        component = fixture.componentInstance;
        component.node = { name: 'folder', allowedRoles: ['viewer'], isActive: true, createdAt: '' };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('expands a folder using Enter and collapses it using Space', () => {
        const node: HTMLElement = fixture.nativeElement.querySelector('.node-container');
        node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        fixture.detectChanges();
        expect(node.getAttribute('aria-expanded')).toBe('true');
        const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        node.dispatchEvent(space);
        fixture.detectChanges();
        expect(node.getAttribute('aria-expanded')).toBe('false');
        expect(space.defaultPrevented).toBe(true);
    });
});
