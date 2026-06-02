import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/api/api.config';
import { AddSharedExpenseRequest } from './coloc.models';
import { ColocService } from './coloc.service';

describe('ColocService', () => {
  let service: ColocService;
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
    service = TestBed.inject(ColocService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists my groups', () => {
    service.listGroups().subscribe();
    const req = httpMock.expectOne(`${base}/coloc/groups`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('lists group expenses', () => {
    service.listExpenses('g1').subscribe();
    const req = httpMock.expectOne(`${base}/coloc/groups/g1/expenses`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('POSTs an equal shared expense', () => {
    const body: AddSharedExpenseRequest = {
      payerUserId: 'u1',
      accountId: 'a1',
      description: 'Courses',
      date: '2026-05-10',
      total: 30,
      splitMethod: 'equal',
      participantUserIds: ['u2', 'u3'],
    };
    service.addExpense('g1', body).subscribe();
    const req = httpMock.expectOne(`${base}/coloc/groups/g1/expenses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.splitMethod).toBe('equal');
    expect(req.request.body.total).toBe(30);
    req.flush({});
  });

  it('GETs balances', () => {
    service.balances('g1').subscribe();
    const req = httpMock.expectOne(`${base}/coloc/groups/g1/balances`);
    expect(req.request.method).toBe('GET');
    req.flush({ yourNet: 0, netToSettle: 0, balances: [], transfers: [] });
  });

  it('POSTs settle-all', () => {
    service.settleAll('g1').subscribe();
    const req = httpMock.expectOne(`${base}/coloc/groups/g1/settle-all`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('POSTs settle for one expense', () => {
    service.settleExpense('e1').subscribe();
    const req = httpMock.expectOne(`${base}/coloc/expenses/e1/settle`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});
