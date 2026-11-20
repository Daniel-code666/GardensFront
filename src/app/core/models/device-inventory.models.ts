import { ProvisioningState } from './provisioning.models';

export type DeviceType = 'Sensor' | 'Actuator' | 'Microcontroller';
export type ConnectionType = 'OneWire' | 'I2C' | 'Analog' | 'Digital';
export type MeasurementType =
  | 'SoilTemperature'
  | 'AirTemperature'
  | 'AirHumidity'
  | 'Illuminance'
  | 'SoilMoisture';
export type MeasurementUnit = 'Celsius' | 'Lux' | 'Percentage';
export type ActuatorMode = 'Automatic' | 'Manual';
export type DeviceCommandType =
  | 'GetSensorOrActuatorDataById'
  | 'SetWaterPumpControlMode'
  | 'SetWaterPumpState';
export type CommandStatus = 'Pending' | 'Published' | 'Completed' | 'Failed' | 'Expired';
export type TelemetrySource = 'PeriodicTelemetry' | 'CommandResponse';

export type MqttCredentialStatus = 'Pending' | 'Testing' | 'Active' | 'Revoked' | 'Failed';

export interface DeviceTelemetryReadingDto {
  id: number;
  value: number;
  state: boolean | null;
  actuatorMode: ActuatorMode | null;
  source: TelemetrySource;
  requestId: string | null;
  recordedAtUtc: string;
}

export interface DeviceInventoryGeneralDto {
  id: number | null;
  localDeviceId: number;
  name: string;
  customName: string | null;
  devicePin: number | null;
  connectionType: ConnectionType;
  measurementType: MeasurementType | null;
  measurementUnit: MeasurementUnit | null;
  deviceType: DeviceType;
  microcontrollerDeviceId: number;
  i2cSdaPin: number | null;
  i2cSclPin: number | null;
  i2cAddress: number | null;
  active: boolean;
  creationDate: string;
  updateDate: string;
  lastSeenAt: string | null;
  telemetry: DeviceTelemetryReadingDto[];
}

export interface DeviceInventoryFilters {
  selectedDeviceIds: number[] | null;
  selectedMicrocontrollerId: number;
  active: boolean;
  avaliable: boolean;
  deviceType: DeviceType;
  measurementType: MeasurementType;
  measurementUnit: MeasurementUnit;
  telemtryPerRequest: number;
  startDateUtc?: string | null;
  endDateUtc?: string | null;
}

export interface GetTelemetryForDevicesRequest {
  devicesIds: number[];
  itemPerRequest: number;
  startDateUtc?: string | null;
  endDateUtc?: string | null;
}

export interface SetDevicesStateRequest {
  devicesIds: number[];
  state: boolean;
}

export interface DeviceTelemetryDeviceDto {
  id: number;
  microcontrollerDeviceId: number;
  localDeviceId: number;
  name: string;
  customName: string | null;
  displayName: string;
  deviceType: DeviceType;
  active: boolean;
  available: boolean | null;
  connectionType: ConnectionType;
  devicePin: number | null;
  i2cSdaPin: number | null;
  i2cSclPin: number | null;
  i2cAddress: number | null;
  measurementType: MeasurementType | null;
  measurementUnit: MeasurementUnit | null;
}

export interface DeviceTelemetryDto {
  device: DeviceTelemetryDeviceDto;
  telemetry: DeviceTelemetryReadingDto[];
}

export interface SensorReadingMessage {
  id: number;
  name: string;
  measurementType: MeasurementType;
  measurementUnit: MeasurementUnit;
  esp32Pin: number;
  connType: ConnectionType;
  value: number;
}

export interface ActuatorReadingMessage {
  id: number;
  name: string;
  esp32Pin: number;
  connType: ConnectionType;
  mode: ActuatorMode;
  state: number;
}

export interface DeviceTelemetryMessage {
  sensorReadings: SensorReadingMessage[];
  actuatorReadings: ActuatorReadingMessage[];
}

export interface DeviceActionResultMessage {
  type: string;
  contractVersion: number;
  requestId: string;
  deviceId: string;
  command: DeviceCommandType;
  success: boolean;
  telemetry: DeviceTelemetryMessage;
}

export interface DeviceCommandRequest {
  deviceIds: number[];
  command: DeviceCommandType;
  state: boolean | null;
  mode: ActuatorMode | null;
}

export interface DeviceCommandResponse {
  id: number;
  microcontrollerDeviceId: number;
  deviceId: string;
  requestId: string;
  commandVersion: number;
  command: DeviceCommandType;
  status: CommandStatus;
  success: boolean | null;
  deviceResponse: DeviceActionResultMessage | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  expiresAt: string;
  publishedAt: string | null;
  completedAt: string | null;
}

export interface DeviceCommandExecutionResponse {
  command: DeviceCommandResponse;
  deviceResponse: DeviceActionResultMessage | null;
  responded: boolean;
}

export interface DeviceReferenceDto {
  id: number;
  deviceType: DeviceType;
}

export interface MicroControllerDeviceDto {
  id: number;
  name: string;
  description: string | null;
  publicId: string;
  hardwareId: string;
  mqttClientId: string;
  board: string;
  firmwareVersion: string;
  provisioningState: ProvisioningState;
  deviceId: string;
  ownerId: number | null;
  ownerName: string | null;
  ownerEmail: string | null;
  existingDevicesQty: number;
  creationDate: string;
  updateDate: string;
  active: boolean;
  mqttCredentialStatus: MqttCredentialStatus | null;
  devices: DeviceReferenceDto[];
}

export interface DeviceCommandResponseDto {
  id: number;
  microcontrollerDeviceId: number;
  deviceId: string;
  requestId: string;
  commandVersion: number;
  command: DeviceCommandType;
  status: CommandStatus;
  success: boolean | null;
  deviceResponse: DeviceActionResultMessage | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  expiresAt: string;
  publishedAt: string | null;
  completedAt: string | null;
}

export interface DeviceCommandDashboardRequest {
  microcrontrollerId: number;
  itemPerRequest: number;
  statusList: CommandStatus[];
}

export interface MicrocontrollerWDevicesDto {
  id: number;
  name: string;
  description: string | null;
  publicId: string;
  hardwareId: string;
  mqttClientId: string;
  board: string;
  firmwareVersion: string;
  provisioningState: ProvisioningState;
  deviceId: string;
  ownerId: number | null;
  ownerName: string | null;
  ownerEmail: string | null;
  existingDevicesQty: number;
  creationDate: string;
  updateDate: string;
  active: boolean;
  devices: DeviceInventoryGeneralDto[];
}

export interface DeviceTelemetryRequest {
  deviceId: number;
  microcontrollerId: number;
  itemPerRequest: number;
  startDateUtc?: string | null;
  endDateUtc?: string | null;
}

export interface TelemetryRealtimeDto {
  microcontrollerDeviceId: string;
  readings: TelemetryRealtimeReadingDto[];
}

export interface TelemetryRealtimeReadingDto {
  deviceId: number;
  value: number;
  state: boolean | null;
  actuatorMode: ActuatorMode | null;
  source: TelemetrySource;
  requestId: string | null;
  recordedAtUtc: string;
}
