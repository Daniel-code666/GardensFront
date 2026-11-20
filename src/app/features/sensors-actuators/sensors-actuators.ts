import { Component, computed, inject, signal } from '@angular/core';
import { DeviceApiService } from '../../core/services/device-api.service';
import { MicrocontrollerWDevicesDto } from '../../core/models/device-inventory.models';
import { finalize } from 'rxjs';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { DataView } from 'primeng/dataview';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sensors-actuators',
  imports: [BreadcrumbModule, RouterModule, DataView, Tag, Button],
  templateUrl: './sensors-actuators.html',
  styleUrl: './sensors-actuators.css',
})
export class SensorsActuators {
  readonly deviceApiService = inject(DeviceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly microcontrollerId = Number(this.route.snapshot.paramMap.get('microcontrollerId'));
  readonly loadedMicrocontroller = signal<MicrocontrollerWDevicesDto | null>(null);
  readonly devices = computed(() => this.loadedMicrocontroller()?.devices ?? []);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly searchTerm = signal('')

  readonly breadcrumbItems: MenuItem[] = [
    {
      label: 'Mis dispositivos',
      routerLink: ['/dashboard', 'my-devices']
    },
    {
      label: 'Sensores y actuadores'
    }
  ];

  readonly filteredDevices = computed(() => {
    const term = this.normalizeText(this.searchTerm());

    if (!term) {
      return this.devices();
    }

    return this.devices().filter(device =>
      [
        device.name,
        device.customName,
        device.devicePin,
        device.connectionType,
        device.measurementType,
        device.measurementUnit
      ].some(value => this.normalizeText(value).includes(term))
    );
  });


  ngOnInit() {
    this.getMicrocontrollerDeviceById(this.microcontrollerId);
  }

  getMicrocontrollerDeviceById(id: number): void {
    this.loading.set(true);

    this.deviceApiService.getMicrocontrollerDeviceById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(
        {
          next: (response) => {
            this.loadedMicrocontroller.set(response);
          },
          error: (err) => {
            this.error.set(err.message);
            this.loading.set(false);
          }
        }
      )
  }

  navigateToDeviceTelemetryDemand(deviceId: number) {
    this.router.navigate(['/dashboard', 'my-devices', 'devices', this.microcontrollerId, 'telemetry', deviceId]);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
