import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FactoryResetRequest,
  StartDeviceProvisioningRequest,
  StartDeviceProvisioningResponse,
} from '../models/provisioning.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DeviceProvisioningService {
  private readonly http = inject(HttpClient);

  start(request: StartDeviceProvisioningRequest): Observable<StartDeviceProvisioningResponse> {
    return this.http.post<StartDeviceProvisioningResponse>(
      '/api/DeviceProvisioning/start',
      request,
    );
  }

  factoryReset(request: FactoryResetRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/DeviceProvisioning/factory-reset`, request);
  }
}
