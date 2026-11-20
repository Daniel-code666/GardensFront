import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from '../http/api-params';
import {
    DeviceCommandDashboardRequest,
    DeviceCommandExecutionResponse,
    DeviceCommandRequest,
    DeviceCommandResponse,
    DeviceCommandResponseDto,
    DeviceInventoryFilters,
    DeviceInventoryGeneralDto,
    DeviceTelemetryDto,
    DeviceTelemetryReadingDto,
    DeviceTelemetryRequest,
    DeviceType,
    GetTelemetryForDevicesRequest,
    MicroControllerDeviceDto,
    MicrocontrollerWDevicesDto,
    SetDevicesStateRequest,
} from '../models/device-inventory.models';

@Injectable({
    providedIn: 'root',
})
export class DeviceApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/DeviceInventory`;

    createDevice(device: DeviceInventoryGeneralDto): Observable<DeviceInventoryGeneralDto> {
        return this.http.post<DeviceInventoryGeneralDto>(`${this.baseUrl}/CreateDevice`, device);
    }

    getDeviceById(deviceId: number): Observable<DeviceInventoryGeneralDto | null> {
        return this.http.get<DeviceInventoryGeneralDto | null>(
            `${this.baseUrl}/GetDeviceById/${deviceId}`,
        );
    }

    getDevices(filters: DeviceInventoryFilters): Observable<DeviceInventoryGeneralDto[]> {
        return this.http.post<DeviceInventoryGeneralDto[]>(`${this.baseUrl}/GetDevices`, filters);
    }

    getDevicesWithTelemetry(
        request: GetTelemetryForDevicesRequest,
    ): Observable<DeviceTelemetryDto[]> {
        return this.http.post<DeviceTelemetryDto[]>(
            `${this.baseUrl}/GetDevicesWithTelemetry`,
            request,
        );
    }

    setDeviceState(request: SetDevicesStateRequest): Observable<boolean> {
        return this.http.put<boolean>(`${this.baseUrl}/SetDeviceState`, request);
    }

    updateDevice(device: DeviceInventoryGeneralDto): Observable<DeviceInventoryGeneralDto> {
        return this.http.put<DeviceInventoryGeneralDto>(`${this.baseUrl}/UpdateDevice`, device);
    }

    executeCommand(
        request: DeviceCommandRequest,
        waitForResponse = false,
    ): Observable<DeviceCommandExecutionResponse> {
        return this.http.post<DeviceCommandExecutionResponse>(`${this.baseUrl}/Commands`, request, {
            params: toHttpParams({ waitForResponse }),
        });
    }

    getDeviceCommandById(commandId: number): Observable<DeviceCommandResponse> {
        return this.http.get<DeviceCommandResponse>(`${this.baseUrl}/Commands/${commandId}`);
    }

    getDeviceCommandByRequest(
        deviceId: string,
        requestId: string,
    ): Observable<DeviceCommandResponse> {
        return this.http.get<DeviceCommandResponse>(
            `${this.baseUrl}/Commands/by-request/${encodeURIComponent(deviceId)}/${encodeURIComponent(requestId)}`,
        );
    }

    getAllMicrocontrollerDevicesAssociatedToUser(): Observable<MicroControllerDeviceDto[]> {
        return this.http.get<MicroControllerDeviceDto[]>(
            `${this.baseUrl}/GetAllMicrocontrollerDevicesAssociatedToUser`,
        );
    }

    getMicrocontrollerDeviceById(id: number): Observable<MicrocontrollerWDevicesDto> {
        return this.http.get<MicrocontrollerWDevicesDto>(`${this.baseUrl}/GetMicrocontrollerDeviceById/${id}`)
    }

    getTelemetryByDeviceId(request: DeviceTelemetryRequest): Observable<DeviceTelemetryReadingDto[]> {
        return this.http.post<DeviceTelemetryReadingDto[]>(`${this.baseUrl}/GetTelemetryByDeviceId`, request);
    }

    getDevicesByTypeAndMicroCtrlId(microCtrlId:number, deviceType: DeviceType): Observable<DeviceInventoryGeneralDto[]> {
        return this.http.get<DeviceInventoryGeneralDto[]>(`${this.baseUrl}/GetDevicesByTypeAndMicroCtrlId/${microCtrlId}/${deviceType}`);
    }

    getCommands(request: DeviceCommandDashboardRequest) : Observable<DeviceCommandResponseDto[]> {
        return this.http.post<DeviceCommandResponseDto[]>(`${this.baseUrl}/GetCommands`, request);
    }
}
