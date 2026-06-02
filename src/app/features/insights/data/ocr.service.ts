import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import { ReceiptExtraction } from './ai.models';

@Injectable({ providedIn: 'root' })
export class OcrService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  /**
   * Envoie une image de reçu et récupère {total, marchand, date}. L'image n'est pas persistée côté
   * back. 503 si la clé IA n'est pas configurée, 400 si le format n'est pas supporté.
   */
  scanReceipt(file: File): Observable<ReceiptExtraction> {
    const form = new FormData();
    form.append('file', file);
    // Pas de Content-Type manuel : le navigateur pose le boundary multipart.
    return this.http.post<ReceiptExtraction>(
      `${this.baseUrl}/ocr/receipt`,
      form,
    );
  }
}
