import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserApiService } from '../user.api.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // inyectar los componentes del form builder
  // el servicio de autenticación
  // y el router
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserApiService);
  private readonly router = inject(Router);

  // preparar dos señales para el estado de carga y error
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  // configurar formulario
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.email, Validators.required, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(128)]]
  });

  // método para enviar el formulario al método de userService
  submit(): void {
    // validar que el formulario no sea inválido o que no esté cargando
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.userService.login(this.form.getRawValue()).subscribe(
      {
        next: () => {
          this.router.navigate(['/dashboard'])
        },
        error: (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      }
    );
  }
}
