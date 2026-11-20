import { ChangeDetectorRef, Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { DeviceApiService } from '../../core/services/device-api.service';
import { Breadcrumb } from 'primeng/breadcrumb';
import {
  ActuatorMode,
  DeviceCommandRequest,
  DeviceCommandType,
  DeviceTelemetryDto,
  GetTelemetryForDevicesRequest
} from '../../core/models/device-inventory.models';
import { finalize } from 'rxjs';
import { UIChart } from 'primeng/chart';
import { isPlatformBrowser } from '@angular/common';
import { Tag } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputMaskModule } from 'primeng/inputmask';

interface TelemetryMetric {
  label: string;
  value: string;
  icon: string;
}

interface CommandOption {
  value: DeviceCommandType;
  label: string;
  description: string;
}

@Component({
  selector: 'app-device-telemetry-demand',
  imports: [Breadcrumb, UIChart, Tag, DatePickerModule, FormsModule, ReactiveFormsModule, InputMaskModule],
  templateUrl: './device-telemetry-demand.html',
  styleUrl: './device-telemetry-demand.css',
})
export class DeviceTelemetryDemand {
  readonly deviceApiService = inject(DeviceApiService);
  private readonly route = inject(ActivatedRoute);
  private cd = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  readonly microcontrollerId = Number(this.route.snapshot.paramMap.get('microcontrollerId'));
  readonly deviceId = Number(this.route.snapshot.paramMap.get('deviceId'));

  readonly loading = signal(false);
  readonly error = signal('');
  readonly commandLoading = signal(false);
  readonly commandError = signal('');
  readonly commandMessage = signal('');
  readonly selectedCommand = signal<DeviceCommandType>('GetSensorOrActuatorDataById');
  readonly selectedState = signal(false);
  readonly selectedMode = signal<ActuatorMode>('Manual');
  readonly responseTelemetry = signal<DeviceTelemetryDto | null>(null);
  readonly telemetry = computed(() => this.responseTelemetry()?.telemetry ?? []);
  readonly device = computed(() => this.responseTelemetry()?.device ?? null);

 readonly form = this.fb.nonNullable.group({
  itemPerRequest: [0, [Validators.min(1)]],
  startDate: [null as Date | null],
  endDate: [null as Date | null]
 })

  readonly chartReadings = computed(() =>
    [...this.telemetry()].sort(
      (first, second) =>
        Date.parse(first.recordedAtUtc) - Date.parse(second.recordedAtUtc)
    )
  );
  
  readonly isActuator = computed(() => this.device()?.deviceType === 'Actuator');
  readonly commandOptions: CommandOption[] = [
    {
      value: 'GetSensorOrActuatorDataById',
      label: 'Consultar lectura actual',
      description: 'Solicita al dispositivo su valor o estado actual y espera la respuesta del microcontrolador.'
    },
    {
      value: 'SetWaterPumpControlMode',
      label: 'Cambiar modo de control',
      description: 'Cambia el actuador entre control manual y automático.'
    },
    {
      value: 'SetWaterPumpState',
      label: 'Cambiar estado',
      description: 'Envía al actuador la orden de encenderse o apagarse.'
    }
  ];
  readonly availableCommands = computed(() =>
    this.isActuator()
      ? this.commandOptions
      : this.commandOptions.filter(option => option.value === 'GetSensorOrActuatorDataById')
  );
  readonly selectedCommandOption = computed(() =>
    this.commandOptions.find(option => option.value === this.selectedCommand())
      ?? this.commandOptions[0]
  );
  
  readonly measurementUnitLabel = computed(() => {
    switch (this.device()?.measurementUnit) {
      case 'Celsius':
        return '°C';
      case 'Lux':
        return 'lx';
      case 'Percentage':
        return '%';
      default:
        return 'Valor';
    }
  });
  options: any;
  platformId = inject(PLATFORM_ID);

  readonly chartData = computed(() => {
    const readings = this.chartReadings();
    const labels = readings.map(reading =>
      new Date(reading.recordedAtUtc).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    );

    if (this.isActuator()) {
      return {
        labels,
        datasets: [
          {
            label: 'Estado',
            data: readings.map(reading =>
              reading.state == null ? null : reading.state ? 1 : 0
            ),
            borderColor: '#25633f',
            backgroundColor: 'rgba(37, 99, 63, 0.14)',
            fill: true,
            stepped: true,
            tension: 0,
            pointRadius: 3,
            pointHoverRadius: 6,
            spanGaps: true
          }
        ]
      };
    }

    const values = readings.map(reading =>
      this.roundToTwoDecimals(reading.value)
    );
    const average = values.length
      ? this.roundToTwoDecimals(
          values.reduce((total, value) => total + value, 0) / values.length
        )
      : 0;

    return {
      labels,
      datasets: [
        {
          label: this.device()?.measurementType ?? 'Valor',
          data: values,
          fill: true,
          borderColor: '#25633f',
          backgroundColor: 'rgba(37, 99, 63, 0.14)',
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Promedio',
          data: readings.map(() => average),
          fill: false,
          borderColor: '#d18b24',
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    };
  });

  readonly summaryMetrics = computed<TelemetryMetric[]>(() => {
    const readings = this.chartReadings();
    const latest = readings.at(-1);

    if (!latest) {
      return [];
    }

    if (this.isActuator()) {
      const changes = readings.slice(1).reduce(
        (total, reading, index) =>
          total + (reading.state !== readings[index].state ? 1 : 0),
        0
      );

      return [
        {
          label: 'Estado actual',
          value: latest.state == null ? 'Sin dato' : latest.state ? 'Encendido' : 'Apagado',
          icon: 'power_settings_new'
        },
        {
          label: 'Modo',
          value: latest.actuatorMode ?? 'Sin dato',
          icon: 'tune'
        },
        {
          label: 'Cambios',
          value: changes.toString(),
          icon: 'swap_vert'
        },
        {
          label: 'Lecturas encendido',
          value: readings.filter(reading => reading.state === true).length.toString(),
          icon: 'bolt'
        },
        {
          label: 'Muestras',
          value: readings.length.toString(),
          icon: 'data_usage'
        }
      ];
    }

    const values = readings.map(reading => reading.value).filter(Number.isFinite);
    const average = values.reduce((total, value) => total + value, 0) / values.length;

    return [
      { label: 'Última lectura', value: this.formatValue(latest.value), icon: 'schedule' },
      { label: 'Mínimo', value: this.formatValue(Math.min(...values)), icon: 'south' },
      { label: 'Máximo', value: this.formatValue(Math.max(...values)), icon: 'north' },
      { label: 'Promedio', value: this.formatValue(average), icon: 'monitoring' },
      { label: 'Muestras', value: values.length.toString(), icon: 'data_usage' }
    ];
  });

  readonly breadcrumbItems: MenuItem[] = [
    {
      label: 'Mis dispositivos',
      routerLink: ['/dashboard', 'my-devices']
    },
    {
      label: 'Sensores y actuadores',
      routerLink: [
        '/dashboard',
        'my-devices',
        'devices',
        this.microcontrollerId
      ]
    },
    {
      label: 'Telemetría por dispositivo'
    }
  ];

  ngOnInit() {
    this.initChart();
    this.getDevicesWithTelemetry(this.buildDeviceRequest());
  }

  reload() {
    this.form.reset();
    this.ngOnInit();
  }

  getDevicesWithTelemetryFromForm() {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { itemPerRequest, startDate, endDate } = this.form.getRawValue();
    const deviceTelemetryDto = this.buildDeviceRequest();

    deviceTelemetryDto.itemPerRequest = itemPerRequest;
    deviceTelemetryDto.startDateUtc = startDate ? this.toUtcIsoDate(startDate, false) : null;
    deviceTelemetryDto.endDateUtc = endDate ? this.toUtcIsoDate(endDate, true) : null;

    this.getDevicesWithTelemetry(deviceTelemetryDto);
  }

  getDevicesWithTelemetry(
    request: GetTelemetryForDevicesRequest,
    showLoadingState = true
  ) {
    if (showLoadingState) {
      this.loading.set(true);
    }

    this.deviceApiService.getDevicesWithTelemetry(request)
      .pipe(finalize(() => {
        if (showLoadingState) {
          this.loading.set(false);
        }
      }))
      .subscribe(
        {
          next: (response) => {
            this.responseTelemetry.set(response[0]);
            this.initChart();
          },
          error: (err) => {
            this.error.set(err.message);
          }
        }
      );
  }

  onCommandChange(event: Event): void {
    const command = (event.target as HTMLSelectElement).value as DeviceCommandType;
    this.selectedCommand.set(command);
    this.commandError.set('');
    this.commandMessage.set('');
  }

  onStateChange(event: Event): void {
    this.selectedState.set((event.target as HTMLSelectElement).value === 'true');
  }

  onModeChange(event: Event): void {
    this.selectedMode.set((event.target as HTMLSelectElement).value as ActuatorMode);
  }

  executeSelectedCommand(): void {
    const device = this.device();

    if (!device || !device.active || this.commandLoading()) {
      return;
    }

    const command = this.selectedCommand();
    const request: DeviceCommandRequest = {
      deviceIds: [device.id],
      command,
      state: command === 'SetWaterPumpState' ? this.selectedState() : null,
      mode: command === 'SetWaterPumpControlMode' ? this.selectedMode() : null
    };

    this.commandLoading.set(true);
    this.commandError.set('');
    this.commandMessage.set('');

    this.deviceApiService.executeCommand(request, true)
      .pipe(finalize(() => this.commandLoading.set(false)))
      .subscribe({
        next: response => {
          if (response.responded && response.deviceResponse?.success === false) {
            this.commandError.set(
              response.command.errorMessage ?? 'El dispositivo rechazó el comando.'
            );
            return;
          }

          this.commandMessage.set(
            response.responded
              ? 'El dispositivo ejecutó el comando correctamente.'
              : `El comando fue enviado y quedó en estado ${this.commandStatusLabel(response.command.status)}.`
          );

          if (response.responded && response.deviceResponse?.success === true) {
            this.getDevicesWithTelemetry(this.buildDeviceRequest(), false);
          }
        },
        error: err => this.commandError.set(err.message)
      });
  }

  private buildDeviceRequest(): GetTelemetryForDevicesRequest {
    const deviceTelemetryDto: GetTelemetryForDevicesRequest = {
      devicesIds: [this.deviceId],
      itemPerRequest: 20,
      startDateUtc: null,
      endDateUtc: null
    }

    return deviceTelemetryDto;
  }

  private toUtcIsoDate(date: Date, endOfDay: boolean): string {
    const normalizedDate = new Date(date);

    if (endOfDay) {
      normalizedDate.setHours(23, 59, 59, 999);
    } else {
      normalizedDate.setHours(0, 0, 0, 0);
    }

    return normalizedDate.toISOString();
  }

  private commandStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      Pending: 'pendiente',
      Published: 'publicado',
      Completed: 'completado',
      Failed: 'fallido',
      Expired: 'expirado'
    };

    return labels[status] ?? status;
  }

  initChart() {
    if (isPlatformBrowser(this.platformId)) {
      const documentStyle = getComputedStyle(document.documentElement);
      const textColor = documentStyle.getPropertyValue('--p-text-color');
      const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
      const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');
      const measurementUnit = this.isActuator() ? 'Estado' : this.measurementUnitLabel();
      const isActuator = this.isActuator();

      this.options = {
        stacked: false,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: !isActuator,
            labels: {
              color: textColor,
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              title: (items: any[]) => {
                const reading = this.chartReadings()[items[0]?.dataIndex];

                return reading
                  ? new Date(reading.recordedAtUtc).toLocaleString('es-CO', {
                      dateStyle: 'medium',
                      timeStyle: 'medium'
                    })
                  : '';
              },
              label: (context: any) => {
                if (context.dataset.label === 'Promedio') {
                  return `Promedio: ${this.formatValue(context.parsed.y)}`;
                }

                if (isActuator) {
                  return `Estado: ${context.parsed.y === 1 ? 'Encendido' : 'Apagado'}`;
                }

                return `${context.dataset.label}: ${this.formatValue(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Fecha',
              color: textColor
            },
            ticks: {
              color: textColorSecondary,
              autoSkip: true,
              maxTicksLimit: 8,
              maxRotation: 0
            },
            grid: {
              color: surfaceBorder
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: measurementUnit,
              color: textColor
            },
            min: isActuator || this.device()?.measurementUnit === 'Percentage' ? 0 : undefined,
            max: isActuator ? 1 : this.device()?.measurementUnit === 'Percentage' ? 100 : undefined,
            ticks: {
              color: textColorSecondary,
              stepSize: isActuator ? 1 : undefined,
              callback: isActuator
                ? (value: number | string) => Number(value) === 1 ? 'Encendido' : 'Apagado'
                : (value: number | string) =>
                    new Intl.NumberFormat('es-CO', {
                      maximumFractionDigits: 2
                    }).format(Number(value))
            },
            grid: {
              color: surfaceBorder
            }
          }
        }
      };
      this.cd.markForCheck();
    }
  }

  private formatValue(value: number): string {
    const formattedValue = new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 2
    }).format(value);

    return `${formattedValue} ${this.measurementUnitLabel()}`;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
