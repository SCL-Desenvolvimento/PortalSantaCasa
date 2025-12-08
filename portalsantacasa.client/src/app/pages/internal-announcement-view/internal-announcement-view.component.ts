import { Component, OnInit } from '@angular/core';
import { InternalAnnouncement } from '../../models/internal-announcement.model';
import { InternalAnnouncementService } from '../../core/services/internal-announcement.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-internal-announcement-view',
  standalone: false,
  templateUrl: './internal-announcement-view.component.html',
  styleUrl: './internal-announcement-view.component.css'
})
export class InternalAnnouncementViewComponent implements OnInit {
  announcementList: InternalAnnouncement[] = [];
  mainAnnouncement?: InternalAnnouncement;

  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  isLoading = true;
  hasError = false;

  constructor(
    private announcementService: InternalAnnouncementService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadAnnouncements(this.currentPage);
  }

  loadAnnouncements(page: number): void {
    this.isLoading = true;
    this.hasError = false;

    this.announcementService.getPaginated(page, this.perPage).subscribe({
      next: (data) => {
        if (Array.isArray(data.items) && data.items.length) {
          // 🔹 Filtra apenas os anúncios ativos
          const activeItems = data.items.filter(item => item.isActive);

          if (activeItems.length) {
            this.mainAnnouncement = activeItems[0];
            this.announcementList = activeItems.slice(1);
          } else {
            this.mainAnnouncement = undefined;
            this.announcementList = [];
          }

          this.totalPages = data.totalPages;
          this.currentPage = data.currentPage;
        } else {
          this.mainAnnouncement = undefined;
          this.announcementList = [];
        }

        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }


  /** Gera um preview seguro em HTML */
  getExcerpt(content: string): SafeHtml {
    if (!content) return '';

    const cleaned = this.cleanHtmlContent(content);

    // Remove tags só para cortar o texto
    const plainText = cleaned.replace(/<[^>]*>/g, '');

    let excerpt = plainText;
    if (plainText.length > 150) {
      excerpt = plainText.substring(0, 150) + '...';
    }

    return this.sanitizer.bypassSecurityTrustHtml(excerpt);
  }

  /** Mesma ideia da tela de detalhe */
  private cleanHtmlContent(content: string): string {
    return content
      .replace(/&nbsp;/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/<p><\/p>/g, '')
      .trim();
  }

}
