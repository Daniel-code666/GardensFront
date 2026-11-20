import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { catchError, throwError } from "rxjs";
import { ApiError } from "./api-error";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            const problem = error.error as ApiError | null;

            const message = problem?.detail || problem?.title || getDefaultMessage(error?.status);

            return throwError(() => ({status: error.status, message, traceId: problem?.traceId}));
        })
    )

    function getDefaultMessage(status: number): string {
        switch (status) {
            case 0: return 'No fue posible conectar con el servidor.';
            case 400: return 'Los datos enviados no son válidos.';
            case 401: return 'Credenciales incorrectas o sesión expirada.';
            case 403: return 'No tienes permisos para realizar esta acción.';
            case 404: return 'El recurso solicitado no existe.';
            case 409: return 'La operación presenta un conflicto.';
            default: return 'Ocurrió un error inesperado.';
        }
    }
}