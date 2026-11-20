export interface SaveDeviceConnectivityConfigurationRequest {
  apiHost: string;
  apiPort: number;
  apiUseTls: boolean;
  mqttHost: string;
  mqttPort: number;
  mqttUseTls: boolean;
}

export interface DeviceConnectivityConfigurationResponse
  extends SaveDeviceConnectivityConfigurationRequest {
  id: number;
  apiBaseUrl: string;
  mqttEndpoint: string;
  creationDate: string;
  updateDate: string | null;
}
