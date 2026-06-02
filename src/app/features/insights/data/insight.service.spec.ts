import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/api/api.config';
import { InsightService } from './insight.service';

describe('InsightService', () => {
  let service: InsightService;
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
    service = TestBed.inject(InsightService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs to generate the monthly insight', () => {
    service.monthly().subscribe();
    const req = httpMock.expectOne(`${base}/insights/monthly`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
