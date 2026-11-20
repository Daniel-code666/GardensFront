import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserApiService } from '../user.api.service';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserApiService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(128)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(128)]],
    password: ['', [Validators.required, Validators.maxLength(128)]]
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.userService.register(this.form.getRawValue()).subscribe(
      {
        next: () => {
          Swal.fire({
            title: 'Usuario creado',
            text: 'El usuario fue registrado correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          })
          this.router.navigate(['/auth/login'])
        },
        error: (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      }
    );
  }
}
