import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BenefitService } from '../../core/services/benefit.service';
import { Benefit } from '../../models/benefit.model';

@Component({
  selector: 'app-benefits',
  imports: [CommonModule, FormsModule],
  templateUrl: './benefits.component.html',
  styleUrls: ['./benefits.component.css']
})
export class BenefitsComponent implements OnInit {
  benefits: Benefit[] = [];
  search = '';
  category = '';
  loading = true;
  error = false;
  constructor(private service: BenefitService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.error = false;
    this.service.getPublic().subscribe({
      next: data => { this.benefits = data; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }
  get categories(): string[] { return [...new Set(this.benefits.map(b => b.category).filter(Boolean))].sort(); }
  get filtered(): Benefit[] {
    const term = this.search.trim().toLocaleLowerCase('pt-BR');
    return this.benefits.filter(b => (!this.category || b.category === this.category) &&
      `${b.title} ${b.description} ${b.category} ${b.eligibility}`.toLocaleLowerCase('pt-BR').includes(term));
  }
}
