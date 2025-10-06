import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InternalAnnouncementService } from '../../core/services/internal-announcement.service';
import { InternalAnnouncement } from '../../models/internal-announcement.model';

@Component({
  selector: 'app-internal-announcement-detail',
  standalone: false,
  templateUrl: './internal-announcement-detail.component.html',
  styleUrls: ['./internal-announcement-detail.component.css']
})
export class InternalAnnouncementDetailComponent implements OnInit {
  announcement?: InternalAnnouncement;
  relatedAnnouncements: InternalAnnouncement[] = [];
  isLoading = true;
  hasError = false;

  constructor(
    private announcementService: InternalAnnouncementService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      const announcementId = paramMap.get('id');
      if (announcementId) {
        this.fetchAnnouncement(Number(announcementId));
      } else {
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  fetchAnnouncement(id: number) {
    this.announcementService.getById(id).subscribe({
      next: (data) => {
        this.announcement = {
          ...data,
          content: this.cleanHtmlContent(data.content)
        };
        this.fetchRelatedAnnouncements(id);
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  fetchRelatedAnnouncements(currentId: number) {
    this.announcementService.getPaginated(1, 10).subscribe({
      next: (data) => {
        this.relatedAnnouncements = data.items
          .filter((announcement: InternalAnnouncement) => announcement.id !== currentId)
          .slice(0, 3);
      }
    });
  }

  voltar() {
    this.router.navigate(['/comunicados']);
  }

  navigateToAnnouncement(id: number | undefined) {
    if (id) {
      this.router.navigate(['/comunicado', id]);
    }
  }

  shareAnnouncement() {
    if (navigator.share) {
      navigator.share({
        title: this.announcement?.title,
        text: 'Comunicado Interno',
        url: window.location.href
      }).catch(err => console.error("Erro ao compartilhar:", err));
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copiado para a área de transferência!'))
        .catch(err => console.error("Erro ao copiar:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        alert('Link copiado para a área de transferência!');
      } catch (err) {
        console.error("Erro ao copiar com fallback:", err);
      }

      document.body.removeChild(textArea);
    }
  }

  printAnnouncement() {
    window.print();
  }

  getExcerpt(content: string): string {
    if (!content) return '';
    
    const plainText = content.replace(/<[^>]*>/g, '');
    
    if (plainText.length > 100) {
      return plainText.substring(0, 100) + '...';
    }
    
    return plainText;
  }

  private cleanHtmlContent(content: string | undefined): string {
    if (!content) return '';

    return content
      .replace(/&nbsp;/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/<p><\/p>/g, '')
      .trim();
  }
}
