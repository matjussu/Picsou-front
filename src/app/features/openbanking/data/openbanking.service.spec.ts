import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/api/api.config';
import { OpenBankingService } from './openbanking.service';

describe('OpenBankingService', () => {
  let service: OpenBankingService;
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
    service = TestBed.inject(OpenBankingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the bank catalog', () => {
    service.institutions().subscribe();
    const req = httpMock.expectOne(`${base}/openbanking/institutions`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('GETs the user connections', () => {
    service.connections().subscribe();
    const req = httpMock.expectOne(`${base}/openbanking/connections`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('POSTs to connect a bank with the institution slug', () => {
    service.connect('revolut').subscribe();
    const req = httpMock.expectOne(`${base}/openbanking/connections`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ institutionId: 'revolut' });
    req.flush({});
  });

  it('POSTs to sync a connection by id', () => {
    service.sync('conn-1').subscribe();
    const req = httpMock.expectOne(
      `${base}/openbanking/connections/conn-1/sync`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({ connectionId: 'conn-1', transactionsImported: 0 });
  });

  it('DELETEs a connection to disconnect', () => {
    service.disconnect('conn-1').subscribe();
    const req = httpMock.expectOne(`${base}/openbanking/connections/conn-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
