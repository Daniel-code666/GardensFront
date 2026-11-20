import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  DeviceBootstrapMessage,
  DeviceConfigurationResult,
  DeviceConfigurationStatus,
  DeviceIdentifyResult,
  FactoryResetRequest,
  SerialDeviceEvent,
  StartDeviceProvisioningRequest,
} from '../../core/models/provisioning.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { getApiErrorMessage } from '../../core/http/api-error';
import { WebSerialService } from '../../core/services/web-serial.service';
import { DeviceProvisioningService } from '../../core/services/device-provisioning.service';

@Component({
  selector: 'app-provisioning',
  imports: [ReactiveFormsModule],
  templateUrl: './provisioning.html',
  styleUrl: './provisioning.css',
})
export class Provisioning {
  private readonly formBuilder = inject(FormBuilder);
  private readonly provisioning = inject(DeviceProvisioningService);
  private readonly destroyRef = inject(DestroyRef);

  readonly serial = inject(WebSerialService);
  readonly device = signal<DeviceIdentifyResult | null>(null);
  readonly currentStatus = signal<DeviceConfigurationStatus | null>(null);
  readonly finalResult = signal<DeviceConfigurationResult | null>(null);
  readonly busy = signal(false);
  readonly resetBusy = signal(false);
  readonly provisioningActive = signal(false);
  readonly activeRequestId = signal<string | null>(null);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    ssid: ['', [Validators.required, Validators.maxLength(32)]],
    password: ['', [Validators.maxLength(64)]],
  });

  constructor() {
    this.serial.events
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.processSerialEvent(event));

    this.destroyRef.onDestroy(() => {
      void this.serial.disconnect();
    });
  }

  async connect(): Promise<void> {
    this.errorMessage.set('');
    this.message.set('');
    try {
      await this.serial.connect();
      this.message.set('Puerto conectado. Ahora identifique el dispositivo.');
    } catch (error) {
      this.errorMessage.set(getApiErrorMessage(error, 'No fue posible abrir el puerto serial.'));
    }
  }

  async disconnect(): Promise<void> {
    await this.serial.disconnect();
    this.device.set(null);
    this.currentStatus.set(null);
    this.finalResult.set(null);
    this.provisioningActive.set(false);
    this.activeRequestId.set(null);
    this.message.set('Dispositivo desconectado.');
  }

  async identify(): Promise<void> {
    this.errorMessage.set('');
    try {
      await this.serial.identify();
      this.message.set('Esperando la identidad del ESP…');
    } catch (error) {
      this.errorMessage.set(getApiErrorMessage(error, 'No fue posible identificar el ESP.'));
    }
  }

  async startProvisioning(): Promise<void> {
    const identity = this.device();
    if (
      !identity ||
      this.form.invalid ||
      this.busy() ||
      this.resetBusy() ||
      this.provisioningActive()
    ) {
      this.form.markAllAsTouched();
      if (!identity) {
        this.errorMessage.set('Conecte e identifique el ESP antes de continuar.');
      }
      return;
    }

    if (identity.provisioningState === 'provisioned') {
      this.errorMessage.set('El dispositivo ya está provisionado. Este flujo es para un alta inicial.');
      return;
    }

    this.busy.set(true);
    this.message.set('Creando el dispositivo y el token temporal en el backend…');
    this.errorMessage.set('');
    this.currentStatus.set(null);
    this.finalResult.set(null);

    const values = this.form.getRawValue();
    const request: StartDeviceProvisioningRequest = {
      name: values.name,
      description: values.description,
      contractVersion: identity.contractVersion,
      identifyRequestId: identity.requestId,
      deviceId: identity.deviceId,
      hardwareId: identity.hardwareId,
      mqttClientId: identity.mqttClientId,
      board: identity.board,
      firmwareVersion: identity.firmwareVersion,
      provisioningState: identity.provisioningState,
      wifiConfigured: identity.wifiConfigured,
      mqttConfigured: identity.mqttConfigured,
    };

    try {
      const bootstrap = await firstValueFrom(this.provisioning.start(request));
      this.activeRequestId.set(bootstrap.bootstrapRequestId);
      const serialMessage: DeviceBootstrapMessage = {
        type: 'device_bootstrap',
        contractVersion: bootstrap.contractVersion,
        requestId: bootstrap.bootstrapRequestId,
        wifi: {
          ssid: values.ssid,
          password: values.password,
        },
        service: {
          baseUrl: bootstrap.serviceBaseUrl,
        },
        provisioningToken: bootstrap.provisioningToken,
      };

      this.provisioningActive.set(true);
      await this.serial.send(serialMessage);
      this.serial.appendInfo('Bootstrap enviado de forma segura; se esperan estados del ESP.');
      this.message.set('Configuración enviada. El ESP está probando Wi-Fi y contactando al backend.');
    } catch (error) {
      this.provisioningActive.set(false);
      this.errorMessage.set(
        getApiErrorMessage(error, 'No fue posible iniciar el aprovisionamiento.'),
      );
    } finally {
      this.busy.set(false);
    }
  }

  async resetConfiguration(): Promise<void> {
    const identity = this.device();
    if (!identity || !this.serial.connected() || this.busy() || this.resetBusy()) {
      return;
    }

    const confirmation = await Swal.fire({
      title: '¿Eliminar la configuración?',
      text: 'Se borrará la configuración del ESP y cualquier registro asociado en el servidor.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b1473e',
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const request: FactoryResetRequest = {
      deviceId: identity.deviceId,
      hardwareId: identity.hardwareId,
      mqttClientId: identity.mqttClientId,
    };

    this.resetBusy.set(true);
    this.provisioningActive.set(false);
    this.errorMessage.set('');
    this.message.set('Borrando la configuración local del ESP…');
    let nvsWasReset = false;
    let backendRecordExisted = true;

    try {
      const resetResult = await this.serial.factoryReset(
        identity.deviceId,
        identity.contractVersion,
      );

      if (!resetResult.success) {
        throw new Error(
          `El ESP no pudo borrar la memoria NVS: ${resetResult.errorCode ?? 'error desconocido'}.`,
        );
      }

      nvsWasReset = true;
      this.message.set('Memoria NVS borrada. Eliminando el registro del servidor…');

      try {
        await firstValueFrom(this.provisioning.factoryReset(request));
      } catch (error) {
        if (this.isHttpStatus(error, 404)) {
          backendRecordExisted = false;
        } else {
          throw error;
        }
      }

      this.clearProvisioningState();

      await Swal.fire({
        title: 'Configuración eliminada',
        text: backendRecordExisted
          ? 'Se borró la memoria del ESP y su registro del servidor.'
          : 'Se borró la memoria del ESP. No había un registro asociado en el servidor.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
      });
    } catch (error) {
      this.errorMessage.set(
        nvsWasReset
          ? `La memoria del ESP fue borrada, pero no se pudo limpiar el servidor: ${getApiErrorMessage(error, 'Error desconocido.')}`
          : getApiErrorMessage(error, 'No fue posible eliminar la configuración del ESP.'),
      );
    } finally {
      this.resetBusy.set(false);
    }
  }

  private processSerialEvent(event: SerialDeviceEvent): void {
    if (event.type === 'device_identify_result') {
      const identity = event as DeviceIdentifyResult;
      this.device.set(identity);
      this.currentStatus.set(null);
      this.finalResult.set(null);
      if (!this.form.controls.name.value) {
        this.form.controls.name.setValue(`Huerta ${identity.hardwareId.slice(-6).toUpperCase()}`);
      }
      if (!this.form.controls.description.value) {
        this.form.controls.description.setValue('Dispositivo configurado desde el panel local.');
      }
      this.message.set('Dispositivo identificado. Complete la red Wi-Fi para continuar.');
      return;
    }

    if (event.type === 'device_configuration_status') {
      const status = event as DeviceConfigurationStatus;
      if (this.activeRequestId() && status.requestId !== this.activeRequestId()) {
        return;
      }

      this.currentStatus.set(status);
      if (status.status === 'failed') {
        this.provisioningActive.set(false);
        const failure = status.errorCode ? ` Código: ${status.errorCode}.` : '';
        this.errorMessage.set(
          status.stage === 'wifi'
            ? `El ESP no pudo conectarse a la red Wi-Fi.${failure}`
            : `La configuración falló en la etapa ${status.stage}.${failure}`,
        );
      }
      return;
    }

    if (event.type === 'device_configuration_result') {
      const result = event as DeviceConfigurationResult;
      if (this.activeRequestId() && result.requestId !== this.activeRequestId()) {
        return;
      }

      this.finalResult.set(result);
      this.provisioningActive.set(false);
      this.message.set(
        result.success
          ? 'El ESP confirmó la configuración completa.'
          : 'El ESP reportó un fallo durante la configuración.',
      );
    }
  }

  private clearProvisioningState(): void {
    this.device.set(null);
    this.currentStatus.set(null);
    this.finalResult.set(null);
    this.activeRequestId.set(null);
    this.provisioningActive.set(false);
    this.message.set('Configuración eliminada. Reconecte e identifique el ESP para intentarlo nuevamente.');
  }

  private isHttpStatus(error: unknown, status: number): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === status
    );
  }
}
