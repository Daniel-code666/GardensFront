import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { SessionService } from "./session.service";

export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const token = inject(SessionService).token();

    const publicUrls = ['/Auth/Login', '/User/Register'];

    if (!token || publicUrls.some(url => request.url.includes(url))) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};