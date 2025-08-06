import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Document } from '../../models/document.model';

@Component({
  selector: 'app-folder-node',
  standalone: false,
  templateUrl: './folder-node.component.html',
  styleUrl: './folder-node.component.css'
})
export class FolderNodeComponent {
  @Input() node!: Document;
  @Input() allDocuments: Document[] = [];
  @Output() documentSelected = new EventEmitter<Document>();

  isExpanded: boolean = false;

  ngOnInit(): void {
    this.isExpanded = this.node.expanded ?? false;
  }

  get children(): Document[] {
    return this.node.children || [];
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }

  onSelect(doc: Document): void {
    if (doc.fileUrl) {
      this.documentSelected.emit(doc);
    } else {
      this.toggle();
    }
  }
}

