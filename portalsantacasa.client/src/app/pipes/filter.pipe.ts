import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByStatus',
  standalone: false
})
export class FilterByStatusPipe implements PipeTransform {
  transform(items: any[], status: string): any[] {
    if (!status) return items;
    return items.filter(item => item.status === status);
  }
}

@Pipe({
  name: 'filterNotId',
  standalone: false
})
export class FilterNotIdPipe implements PipeTransform {
  transform(items: any[], id: number | undefined): any[] {
    if (!id) return items;
    return items.filter(item => item.id !== id);
  }
}
