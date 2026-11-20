import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DeviceConnectivityConfigurationResponse,
  SaveDeviceConnectivityConfigurationRequest,
} from '../models/conectivity.models';

@Injectable({ providedIn: 'root' })
export class DeviceConnectivityService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/DeviceConnectivityConfiguration';

  get(): Observable<DeviceConnectivityConfigurationResponse> {
    return this.http.get<DeviceConnectivityConfigurationResponse>(this.endpoint);
  }

  save(
    request: SaveDeviceConnectivityConfigurationRequest,
  ): Observable<DeviceConnectivityConfigurationResponse> {
    return this.http.put<DeviceConnectivityConfigurationResponse>(this.endpoint, request);
  }
}
