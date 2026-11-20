import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DeviceConnectivityConfigurationResponse } from '../../core/models/conectivity.models';
import { DeviceConnectivityService } from '../../core/services/device-connectivity.service';
import { getApiErrorMessage } from '../../core/http/api-error';

@Component({
  selector: 'app-connectivity',
  imports: [ReactiveFormsModule],
  templateUrl: './connectivity.html',
  styleUrl: './connectivity.css',
})
export class Connectivity {
  private readonly formBuilder = inject(FormBuilder);
  private readonly connectivity = inject(DeviceConnectivityService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly savedConfiguration = signal<DeviceConnectivityConfigurationResponse | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    apiHost: ['', [Validators.required, Validators.maxLength(253)]],
    apiPort: [8080, [Validators.required, Validators.min(1), Validators.max(65535)]],
    apiUseTls: [false],
    mqttHost: ['', [Validators.required, Validators.maxLength(253)]],
    mqttPort: [1884, [Validators.required, Validators.min(1), Validators.max(65535)]],
    mqttUseTls: [false],
  });

  ngOnInit(): void {
    this.connectivity
      .get()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (configuration) => {
          this.savedConfiguration.set(configuration);
          this.form.patchValue(configuration);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.message.set('Aún no existe una configuración. Complete los datos para crearla.');
            return;
          }
          this.errorMessage.set(
            getApiErrorMessage(error, 'No fue posible guardar la configuración.'),
          )
        },
      });
  }

  copyApiHostToMqtt(): void {
    this.form.controls.mqttHost.setValue(this.form.controls.apiHost.value);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.message.set('');
    this.errorMessage.set('');
    this.connectivity
      .save(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (configuration) => {
          this.savedConfiguration.set(configuration);
          this.message.set('Configuración guardada. Ya puede continuar con el enlace del ESP.');
        },
        error: (error) =>
          this.errorMessage.set(
            getApiErrorMessage(error, 'No fue posible guardar la configuración.'),
          ),
      });
  }
}
