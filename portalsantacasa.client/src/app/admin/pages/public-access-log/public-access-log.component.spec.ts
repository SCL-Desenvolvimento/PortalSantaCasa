import { of, Subject, throwError } from 'rxjs';
import { PublicAccessLogComponent } from './public-access-log.component';
import { PaginatedPublicAccessLog, PublicAccessLog } from '../../../models/public-access-log.model';

describe('PublicAccessLogComponent', () => {
  let component: PublicAccessLogComponent;
  let service: any;
  const log = (id: number): PublicAccessLog => ({ id, name: 'Person', re: '1', sector: 'TI', page: 'noticias', accessedAt: '2026-09-30T12:00:00Z' });
  beforeEach(() => {
    service = { getReport: jasmine.createSpy(), getContentOptions: jasmine.createSpy() };
    component = new PublicAccessLogComponent(service);
  });
  it('exports every page using bounded requests and preserves filters', () => {
    component.sectorFilter = 'TI'; component.pageFilter = 'noticias';
    service.getReport.and.callFake((query: any) => of({ currentPage: query.page, perPage: 10000, total: 2, pages: 2,
      logs: [log(query.page)] } as PaginatedPublicAccessLog));
    let result: PublicAccessLog[] = [];
    (component as any).loadFilteredLogsForExport().subscribe((logs: PublicAccessLog[]) => result = logs);
    expect(result.map(item => item.id)).toEqual([1, 2]);
    expect(service.getReport).toHaveBeenCalledTimes(2);
    expect(service.getReport.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 2, pageSize: 10000, sector: 'TI', pageType: 'noticias' }));
  });
  it('does not export a partial result when a later page fails', () => {
    service.getReport.and.callFake((query: any) => query.page === 1 ? of({ currentPage: 1, pages: 2, logs: [log(1)] }) : throwError(() => new Error('page failed')));
    component.exportCsv();
    expect(component.isExporting).toBeFalse(); expect(component.errorMessage).toBe('page failed');
  });
  it('ignores stale content options after a different page filter is selected', () => {
    const first = new Subject<any[]>(); service.getContentOptions.and.returnValue(first);
    component.pageFilter = 'noticias'; component.onPageFilterChange();
    component.pageFilter = 'comunicados'; first.next([{ id: 1, title: 'old news' }]);
    expect(component.contentOptions).toEqual([]);
  });
  for (const value of ['=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)', '\t=1+1', '\r=1+1', '  =1+1']) {
    it(`neutralizes spreadsheet formulas: ${JSON.stringify(value)}`, () => {
      expect((component as any).escapeCsvCell(value)).toBe(`"'${value}"`);
    });
  }
  it('quotes embedded quotes and leaves normal text unchanged', () => {
    expect((component as any).escapeCsvCell('Person "Test"')).toBe('"Person ""Test"""');
  });
});
