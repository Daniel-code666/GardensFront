import { CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";
import { SessionService } from "./session.service";

export const authGuard: CanActivateFn = () => {
    const session = inject(SessionService);
    return session.hasValidSession() ? true : inject(Router).createUrlTree(['/login']);
}

export const adminGuard: CanActivateFn = () => {
    const session = inject(SessionService);
    return session.hasValidSession() && session.isAdmin() ? true : inject(Router).createUrlTree(['/dashboard']);
}