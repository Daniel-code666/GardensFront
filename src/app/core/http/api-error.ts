import { HttpErrorResponse } from "@angular/common/http";

export interface ApiError {
    type?: string;
    title?: string;
    status?: number;
    detail?: string;
    instance?: string;
    traceId?: string;
}

interface ProblemDetails {
  detail?: string;
  title?: string;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error ? error.message : fallback;
  }

  if (error.status === 0) {
    return 'No fue posible conectar con el backend. Verifique que Docker y la API estén activos.';
  }

  const problem = error.error as ProblemDetails | string | null;
  if (typeof problem === 'string' && problem.trim()) {
    return problem;
  }

  if (problem && typeof problem === 'object') {
    return problem.detail || problem.title || fallback;
  }

  return fallback;
}