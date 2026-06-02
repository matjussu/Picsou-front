import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/api/api.config';
import { OcrService } from './ocr.service';

describe('OcrService', () => {
  let service: OcrService;
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
    service = TestBed.inject(OcrService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs the receipt as multipart form data', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'receipt.png', {
      type: 'image/png',
    });
    service.scanReceipt(file).subscribe();
    const req = httpMock.expectOne(`${base}/ocr/receipt`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ total: 23.9, merchant: 'Monoprix', date: '2026-05-10' });
  });
});
