import { ChangeDetectorRef, PLATFORM_ID, Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DeviceApiService } from '../../../core/services/device-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { finalize, forkJoin } from 'rxjs';
import { DeviceCommandDashboardRequest, DeviceCommandResponseDto, DeviceInventoryGeneralDto, MeasurementType, MicroControllerDeviceDto, TelemetryRealtimeDto, TelemetryRealtimeReadingDto } from '../../../core/models/device-inventory.models';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { UIChart } from 'primeng/chart';
import { TelemetryRealtimeService } from '../../../core/services/telemetry-realtime.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-dashboard-page',
  imports: [Select, FormsModule, RouterLink, UIChart],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  readonly deviceApiService = inject(DeviceApiService);
  private readonly sessionService = inject(SessionService);
  private readonly telemetryService = inject(TelemetryRealtimeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private cd = inject(ChangeDetectorRef);
  platformId = inject(PLATFORM_ID);

  readonly loading = signal(false);
  readonly loadingDevices = signal(false);
  readonly loadingCommands = signal(false);
  readonly error = signal('');
  readonly errorDevices = signal('');
  readonly errorCommands = signal('');
  readonly microcontrollers = signal<MicroControllerDeviceDto[]>([]);
  readonly selectedMicrocontroller = signal<MicroControllerDeviceDto | null>(null);
  readonly actuatorDevices = signal<DeviceInventoryGeneralDto[]>([]);
  readonly sensorDevices = signal<DeviceInventoryGeneralDto[]>([]);
  readonly commands = signal<DeviceCommandResponseDto[]>([]);
  readonly telemetryData = signal<TelemetryRealtimeDto | null>(null);
  readonly selectedTelemetryIndex = signal(0);

  options: any;

  readonly deviceTypeSummary = computed(() => {
    const devices = this.selectedMicrocontroller()?.devices ?? [];

    return {
      sensors: devices.filter(x => x.deviceType === 'Sensor').length,
      actuators: devices.filter(x => x.deviceType === 'Actuator').length
    }
  });

  readonly telemetryDevices = computed(() => [
    ...this.sensorDevices(),
    ...this.actuatorDevices()
  ]);

  readonly selectedTelemetryDevice = computed(() => {
    const devices = this.telemetryDevices();

    if (devices.length === 0) {
      return null;
    }

    return devices[this.selectedTelemetryIndex()] ?? null;
  });

  readonly device = computed(() => this.selectedTelemetryDevice());
  readonly isActuator = computed(() => this.device()?.deviceType === 'Actuator');

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

  readonly chartReadings = computed(() => {
    const deviceId = this.selectedTelemetryDevice()?.id;

    if (deviceId == null) {
      return [];
    }

    return [...(this.telemetryData()?.readings ?? [])]
      .filter(reading => reading.deviceId === deviceId)
      .sort((first, second) =>
        Date.parse(first.recordedAtUtc) - Date.parse(second.recordedAtUtc)
      );
  });

  readonly chartData = computed(() => {
    const device = this.selectedTelemetryDevice();
    const readings = this.chartReadings();
    const labels = readings.map(reading =>
      new Date(reading.recordedAtUtc).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    );

    if (!device) {
      return { labels: [], datasets: [] };
    }

    if (device.deviceType === 'Actuator') {
      return {
        labels,
        datasets: [
          {
            label: 'Estado',
            data: readings.map(reading =>
              reading.state == null ? null : reading.state ? 1 : 0
            ),
            borderColor: '#285b3a',
            backgroundColor: 'rgba(40, 91, 58, 0.14)',
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
          label: device.measurementType ?? device.name,
          data: values,
          borderColor: '#285b3a',
          backgroundColor: 'rgba(40, 91, 58, 0.14)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Promedio',
          data: readings.map(() => average),
          borderColor: '#b7833f',
          borderDash: [6, 6],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    };
  });

  readonly latestReadings = computed(() => {
    const sensorsById = new Map(
      this.sensorDevices()
        .filter(device => device.id != null)
        .map(device => [device.id as number, device] as const)
    );
    const latestReadingByDevice = new Map<
      number,
      { reading: TelemetryRealtimeReadingDto; device: DeviceInventoryGeneralDto }
    >();

    for (const reading of this.telemetryData()?.readings ?? []) {
      const device = sensorsById.get(reading.deviceId);
      const measurementType = device?.measurementType;

      if (!device || !measurementType) {
        continue;
      }

      const current = latestReadingByDevice.get(reading.deviceId);

      if (
        !current ||
        Date.parse(reading.recordedAtUtc) > Date.parse(current.reading.recordedAtUtc)
      ) {
        latestReadingByDevice.set(reading.deviceId, { reading, device });
      }
    }

    const getValue = (...measurementTypes: MeasurementType[]): string => {
      for (const measurementType of measurementTypes) {
        const matchingReadings = [...latestReadingByDevice.values()]
          .filter(value => value.device.measurementType === measurementType);

        if (matchingReadings.length === 0) {
          continue;
        }

        const average = this.roundToTwoDecimals(
          matchingReadings.reduce(
            (total, value) => total + value.reading.value,
            0
          ) / matchingReadings.length
        );

        return this.formatReadingValue(average, matchingReadings[0].device);
      }

      return 'Sin datos';
    };

    return {
      soilMoisture: getValue('SoilMoisture'),
      temperature: getValue('AirTemperature', 'SoilTemperature'),
      airHumidity: getValue('AirHumidity'),
      illuminance: getValue('Illuminance')
    };
  });

  readonly actuatorCards = computed(() => {
    const latestReadingByDevice = new Map<number, TelemetryRealtimeReadingDto>();

    for (const reading of this.telemetryData()?.readings ?? []) {
      const current = latestReadingByDevice.get(reading.deviceId);

      if (
        !current ||
        Date.parse(reading.recordedAtUtc) > Date.parse(current.recordedAtUtc)
      ) {
        latestReadingByDevice.set(reading.deviceId, reading);
      }
    }

    return this.actuatorDevices().map(device => {
      const reading = device.id == null
        ? undefined
        : latestReadingByDevice.get(device.id);

      return {
        id: device.id,
        name: device.customName || device.name,
        state: reading?.state ?? null,
        stateLabel: reading?.state == null
          ? 'Sin datos'
          : reading.state
            ? 'Encendida'
            : 'Apagada',
        modeLabel: reading?.actuatorMode === 'Automatic'
          ? 'Automático'
          : reading?.actuatorMode === 'Manual'
            ? 'Manual'
            : 'Sin datos'
      };
    });
  });

  ngOnInit() {
    this.telemetryService.telemetry$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(telemetry => {
        if (telemetry.microcontrollerDeviceId !== this.selectedMicrocontroller()?.deviceId) {
          return;
        }

        const currentReadings =
          this.telemetryData()?.microcontrollerDeviceId === telemetry.microcontrollerDeviceId
            ? this.telemetryData()?.readings ?? []
            : [];
        const readingsByKey = new Map<string, TelemetryRealtimeReadingDto>();

        for (const reading of [...currentReadings, ...telemetry.readings]) {
          const key = [
            reading.deviceId,
            reading.recordedAtUtc,
            reading.source,
            reading.requestId ?? ''
          ].join('|');

          readingsByKey.set(key, reading);
        }

        this.telemetryData.set({
          microcontrollerDeviceId: telemetry.microcontrollerDeviceId,
          readings: [...readingsByKey.values()]
            .sort((first, second) =>
              Date.parse(first.recordedAtUtc) - Date.parse(second.recordedAtUtc)
            )
            .slice(-500)
        });
      });

    this.destroyRef.onDestroy(() => {
      void this.telemetryService.unsubscribeFromCurrentMicrocontroller();
    });

    this.getAllMicrocontrollerDevicesAssociatedToUser();
  }

  getAllMicrocontrollerDevicesAssociatedToUser() {
    this.loading.set(true);

    this.deviceApiService.getAllMicrocontrollerDevicesAssociatedToUser()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(
        {
          next: (response) => {
            this.microcontrollers.set(response);

            const first = response.at(0);

            if (!first)
              return;

            this.selectedMicrocontroller.set(first);
            this.activateMicrocontroller(first);
          },
          error: (err) => {
            this.error.set(err.message);
            this.loading.set(false);
          }
        }
      )
  }

  getCommands(microcontrollerId: number) {
    this.loadingCommands.set(true);

    var request: DeviceCommandDashboardRequest = {
      microcrontrollerId: microcontrollerId,
      itemPerRequest: 3,
      statusList: ['Completed', 'Expired', 'Failed', 'Pending', 'Published']
    }

    this.deviceApiService.getCommands(request)
      .pipe(finalize(() => this.loadingCommands.set(false)))
      .subscribe(
        {
          next: (response) => {
            this.commands.set(response);
          },
          error: (err) => {
            this.errorCommands.set(err.message);
            this.loadingCommands.set(false);
          }
        }
      )
  }

  getDevicesByTypeAndMicroCtrlId(microcontrollerId: number) {
    this.loadingDevices.set(true);

    forkJoin({
      actuators: this.deviceApiService.getDevicesByTypeAndMicroCtrlId(
        microcontrollerId,
        'Actuator'
      ),
      sensors: this.deviceApiService.getDevicesByTypeAndMicroCtrlId(
        microcontrollerId,
        'Sensor'
      )
    })
      .pipe(finalize(() => this.loadingDevices.set(false)))
      .subscribe({
        next: ({ actuators, sensors }) => {
          this.actuatorDevices.set(actuators);
          this.sensorDevices.set(sensors);

          this.initChart();
        },
        error: (err) => {
          this.error.set(err.message);
        }
      });
  }

  private async activateMicrocontroller(microcontroller: MicroControllerDeviceDto): Promise<void> {
    this.selectedMicrocontroller.set(microcontroller);

    this.sensorDevices.set([]);
    this.actuatorDevices.set([]);
    this.commands.set([]);
    this.telemetryData.set(null);
    this.selectedTelemetryIndex.set(0);

    this.getDevicesByTypeAndMicroCtrlId(microcontroller.id);
    this.getCommands(microcontroller.id);

    try {
      await this.telemetryService.subscribeToMicrocontroller(microcontroller.id);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No fue posible conectar la telemetría en tiempo real.');
    }
  }

  onMicrocontrollerChange(microcontroller: MicroControllerDeviceDto): void {
    void this.activateMicrocontroller(microcontroller);
  }

  viewTelemetry(deviceId: number | null) {
    const microcontrollerId = this.selectedMicrocontroller()?.id;

    if (!microcontrollerId) {
      return;
    }

    this.router.navigate(['/dashboard', 'my-devices', 'devices', microcontrollerId, 'telemetry', deviceId])
  }

  previousTelemetryDevice(): void {
    const total = this.telemetryDevices().length;

    if (total === 0) {
      return;
    }

    this.selectedTelemetryIndex.update(index => index === 0 ? total - 1 : index - 1);
    this.initChart();
  }

  nextTelemetryDevice(): void {
    
    const total = this.telemetryDevices().length;

    if (total === 0) {
      return;
    }

    this.selectedTelemetryIndex.update(index => index === total - 1 ? 0 : index + 1);
    this.initChart();
  }

  initChart() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const device = this.selectedTelemetryDevice();

    if (!device) {
      return;
    }

    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text').trim() || '#1d2921';
    const textColorSecondary = documentStyle.getPropertyValue('--text-muted').trim() || '#526158';
    const surfaceBorder = documentStyle.getPropertyValue('--border').trim() || '#d9ded7';
    const isActuator = device.deviceType === 'Actuator';
    const measurementUnit = isActuator ? 'Estado' : this.measurementUnitLabel();

    this.options = {
      responsive: true,
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
          min: isActuator || device.measurementUnit === 'Percentage' ? 0 : undefined,
          max: isActuator ? 1 : device.measurementUnit === 'Percentage' ? 100 : undefined,
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

  private formatValue(value: number): string {
    const formattedValue = new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 2
    }).format(value);

    return `${formattedValue} ${this.measurementUnitLabel()}`;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private formatReadingValue(
    value: number,
    device: DeviceInventoryGeneralDto
  ): string {
    const formattedValue = new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 2
    }).format(value);

    switch (device.measurementUnit) {
      case 'Percentage':
        return `${formattedValue}%`;
      case 'Celsius':
        return `${formattedValue} °C`;
      case 'Lux':
        return `${formattedValue} lx`;
      default:
        return formattedValue;
    }
  }
}
