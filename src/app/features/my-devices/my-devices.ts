import { Component, inject, signal } from '@angular/core';
import { DataViewModule } from 'primeng/dataview';
import { DeviceApiService } from '../../core/services/device-api.service';
import { finalize } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Router } from '@angular/router';
import { MicroControllerDeviceDto } from '../../core/models/device-inventory.models';

@Component({
  selector: 'app-my-devices',
  imports: [DataViewModule, TagModule, ButtonModule, TooltipModule],
  templateUrl: './my-devices.html',
  styleUrl: './my-devices.css',
})
export class MyDevices {
  private readonly deviceApiService = inject(DeviceApiService);
  readonly loading = signal(false);
  readonly error = signal('');
  private readonly router = inject(Router);

  readonly microcontrollerDevices = signal<MicroControllerDeviceDto[]>([]);

  ngOnInit(): void {
    this.getAllMicrocontrollerDevicesAssociatedToUser();
  }

  getAllMicrocontrollerDevicesAssociatedToUser(): void {
    this.loading.set(true);
    this.error.set('');

    this.deviceApiService.getAllMicrocontrollerDevicesAssociatedToUser()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(
        {
          next: (response) => {
            this.microcontrollerDevices.set(response);
          },
          error: (err) => {
            this.error.set(err.message);
            this.loading.set(false);
          }
        }
      )
  }

  viewSensorsAndActuators(microcontrollerId: number) {
    this.router.navigate(['/dashboard', 'my-devices', 'devices', microcontrollerId]);
  }
}
