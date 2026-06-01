import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/api/api.config';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
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
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the monthly-summary KPIs', () => {
    service.summary().subscribe();
    const req = httpMock.expectOne(`${base}/dashboard/summary`);
    expect(req.request.method).toBe('GET');
    req.flush({ income: 0, expense: 0, balance: 0, transactionCount: 0 });
  });

  it('GETs the monthly chart series', () => {
    service.monthly().subscribe();
    const req = httpMock.expectOne(`${base}/dashboard/charts/monthly`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('GETs the category breakdown', () => {
    service.categoryBreakdown().subscribe();
    const req = httpMock.expectOne(`${base}/dashboard/charts/category-breakdown`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
