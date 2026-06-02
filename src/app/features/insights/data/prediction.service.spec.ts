import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/api/api.config';
import { PredictionService } from './prediction.service';

describe('PredictionService', () => {
  let service: PredictionService;
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
    service = TestBed.inject(PredictionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the end-of-month prediction', () => {
    service.endOfMonth().subscribe();
    const req = httpMock.expectOne(`${base}/predictions/end-of-month`);
    expect(req.request.method).toBe('GET');
    req.flush({
      forecastDate: '2026-06-30',
      predictedBalance: 0,
      lowConfidence: true,
      anomalies: [],
    });
  });
});
