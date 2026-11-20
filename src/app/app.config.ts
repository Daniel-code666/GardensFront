import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/http/error.interceptor';
import { providePrimeNG } from 'primeng/config';
import { authInterceptor } from './core/auth/auth.interceptor';
import { HuertaTheme } from './core/theme/huerta.theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([errorInterceptor, authInterceptor])
    ),
    providePrimeNG({
      theme: {
        preset: HuertaTheme,
        options: {
          darkModeSelector: false,
        },
      },
    })
  ]
};
