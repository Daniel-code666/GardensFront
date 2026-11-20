import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CreateRoleRequest, CreateRoleResponse } from './models/roles.models';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from '../../core/http/api-params';

@Injectable({
  providedIn: 'root',
})
export class RolesApiService {
  private readonly http = inject(HttpClient);

  createRole(request: CreateRoleRequest): Observable<CreateRoleResponse> {
    return this.http.post<CreateRoleResponse>(`${environment.apiBaseUrl}/Roles/CreateRole`, request);
  }

  findByName(query: string): Observable<CreateRoleResponse> {
    return this.http.get<CreateRoleResponse>(`${environment.apiBaseUrl}/Roles/FindByName`, {
      params: toHttpParams({ name: query }),
    });
  }

  getAllRoles(active: boolean | null): Observable<CreateRoleResponse[]> {
    return this.http.get<CreateRoleResponse[]>(`${environment.apiBaseUrl}/Roles/GetAllRoles`, {
      params: toHttpParams({ active }),
    });
  }

  updateRole(request: CreateRoleResponse): Observable<boolean> {
    return this.http.put<boolean>(`${environment.apiBaseUrl}/Roles/UpdateRole`, request);
  }
}
