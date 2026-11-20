export type ProvisioningState = 'unprovisioned' | 'pending_claim' | 'provisioned';

export interface DeviceIdentifyResult {
  type: 'device_identify_result';
  contractVersion: number;
  requestId: string;
  success: boolean;
  deviceId: string;
  hardwareId: string;
  mqttClientId: string;
  board: string;
  firmwareVersion: string;
  provisioningState: ProvisioningState;
  wifiConfigured: boolean;
  mqttConfigured: boolean;
}

export interface DeviceConfigurationStatus {
  type: 'device_configuration_status';
  contractVersion: number;
  requestId: string;
  stage: string;
  status: string;
  errorCode?: string;
}

export interface DeviceConfigurationResult {
  type: 'device_configuration_result';
  contractVersion: number;
  requestId: string;
  success: boolean;
  deviceId: string;
  firmwareVersion: string;
  provisioningState: ProvisioningState;
  wifiConnected: boolean;
  mqttConnected: boolean;
  mqttCredentialVersion: number;
  failureCode: string | null;
}

export interface DeviceFactoryResetMessage {
  type: 'device_factory_reset';
  contractVersion: number;
  requestId: string;
  deviceId: string;
}

export interface DeviceFactoryResetResult {
  type: 'device_factory_reset_result';
  contractVersion: number;
  requestId: string;
  success: boolean;
  errorCode: string | null;
}

export type SerialDeviceEvent =
  | DeviceIdentifyResult
  | DeviceConfigurationStatus
  | DeviceConfigurationResult
  | DeviceFactoryResetResult
  | { type: string; [key: string]: unknown };

export interface StartDeviceProvisioningRequest {
  name: string;
  description: string;
  contractVersion: number;
  identifyRequestId: string;
  deviceId: string;
  hardwareId: string;
  mqttClientId: string;
  board: string;
  firmwareVersion: string;
  provisioningState: ProvisioningState;
  wifiConfigured: boolean;
  mqttConfigured: boolean;
}

export interface StartDeviceProvisioningResponse {
  devicePublicId: string;
  deviceId: string;
  bootstrapRequestId: string;
  contractVersion: number;
  serviceBaseUrl: string;
  provisioningToken: string;
  expiresAtUtc: string;
}

export interface DeviceBootstrapMessage {
  type: 'device_bootstrap';
  contractVersion: number;
  requestId: string;
  wifi: {
    ssid: string;
    password: string;
  };
  service: {
    baseUrl: string;
  };
  provisioningToken: string;
}

export interface SerialLogEntry {
  timestamp: string;
  kind: 'info' | 'event' | 'error';
  message: string;
  payload?: SerialDeviceEvent;
}

export interface FactoryResetRequest {
  deviceId: string;
  hardwareId: string;
  mqttClientId: string;
}
