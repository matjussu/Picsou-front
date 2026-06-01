import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/api/api.config';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let httpMock: HttpTestingController;
  const base = 'http://api.test/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: base },
      ],
    });
    service = TestBed.inject(TransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('maps active filters to backend query params (no client-side filtering)', () => {
    service
      .search({ type: 'expense', q: 'resto', from: '2026-05-01', minAmount: 50 })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/transactions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('type')).toBe('expense');
    expect(req.request.params.get('q')).toBe('resto');
    expect(req.request.params.get('from')).toBe('2026-05-01');
    expect(req.request.params.get('minAmount')).toBe('50');
    req.flush([]);
  });

  it('omits unset/empty filters from the query string', () => {
    service.search({ q: '', categoryId: null, type: 'income' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/transactions`);
    expect(req.request.params.keys()).toEqual(['type']);
    expect(req.request.params.get('type')).toBe('income');
    req.flush([]);
  });

  it('issues a GET with no params when no filters are provided', () => {
    service.search().subscribe();

    const req = httpMock.expectOne(`${base}/transactions`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  it('POSTs a new transaction to the backend', () => {
    service
      .create({ amount: 12.5, date: '2026-05-10', description: 'Resto', type: 'expense' })
      .subscribe();

    const req = httpMock.expectOne(`${base}/transactions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.type).toBe('expense');
    expect(req.request.body.amount).toBe(12.5);
    req.flush({});
  });
});
