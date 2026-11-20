import { HttpParams } from "@angular/common/http";

export function toHttpParams(parameters: object): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null) {
      params = params.set(key, String(value));
    }
  }

  return params;
}