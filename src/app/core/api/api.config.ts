import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export const apiBaseUrlProvider = {
  provide: API_BASE_URL,
  useValue: environment.apiBaseUrl,
};
