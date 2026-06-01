import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/api/api.config';
import { GoalService } from './goal.service';

describe('GoalService', () => {
  let service: GoalService;
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
    service = TestBed.inject(GoalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists goals filtered by status via query param', () => {
    service.list('active').subscribe();
    const req = httpMock.expectOne((r) => r.url === `${base}/goals`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('active');
    req.flush([]);
  });

  it('lists all goals without status param', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(`${base}/goals`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  it('POSTs a new goal', () => {
    service.create({ name: 'Italie', targetAmount: 800, template: 'travel' }).subscribe();
    const req = httpMock.expectOne(`${base}/goals`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.targetAmount).toBe(800);
    req.flush({});
  });

  it('POSTs a contribution to a goal', () => {
    service.addContribution('g1', { amount: 50, date: '2026-05-01' }).subscribe();
    const req = httpMock.expectOne(`${base}/goals/g1/contributions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.amount).toBe(50);
    req.flush({});
  });
});
