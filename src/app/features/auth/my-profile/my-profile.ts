import { Component, inject, signal } from '@angular/core';
import { RolesApiService } from '../../roles/roles.api.service';
import { finalize, firstValueFrom } from 'rxjs';
import { CreateRoleResponse } from '../../roles/models/roles.models';
import { CreateUserResponse } from '../models/register.models';
import { SessionService } from '../../../core/auth/session.service';
import { UserApiService } from '../user.api.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-my-profile',
  imports: [ReactiveFormsModule, SelectModule],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css',
})
export class MyProfile {
  submit() {
    throw new Error('Method not implemented.');
  }
  private readonly rolesService = inject(RolesApiService);
  private readonly userService = inject(UserApiService);
  private readonly sessionService = inject(SessionService);

  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly roles = signal<CreateRoleResponse[]>([]);
  readonly userToUpdate = signal<CreateUserResponse | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      id: [0, [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(128)]],
      email: ['', [Validators.required, Validators.maxLength(255)]],
      password: ['', [Validators.maxLength(255)]],
      active: [true, [Validators.required]],
      roleId: [0, [Validators.required, Validators.min(1), Validators.max(10)]],
      roleName: ['', [Validators.required, Validators.maxLength(20)]]
    }
  );

  async ngOnInit() {
    this.getAllRoles();
    await this.getUserById(this.sessionService.user()!.id);

    var userToUpdateData: CreateUserResponse = {
      id: this.userToUpdate()!.id,
      name: this.userToUpdate()!.name,
      email: this.userToUpdate()!.email,
      password: this.userToUpdate()!.password,
      active: this.userToUpdate()!.active,
      roleId: this.userToUpdate()!.roleId,
      roleName: this.userToUpdate()!.roleName,
    }

    this.form.patchValue(userToUpdateData);
  }

  getAllRoles() {
    this.loading.set(true);
    this.rolesService.getAllRoles(true)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.roles.set(response ?? []);
        },
        error: (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      })
  }

  async getUserById(id: number): Promise<void> {
    this.loading.set(true);

    const response = await firstValueFrom(
      this.userService.getUserById(id).pipe(finalize(() => this.loading.set(false)))
    );

    this.userToUpdate.set(response.result);
  }

  onRoleChange(roleId: number): void {
    const role = this.roles().find(x => x.id === roleId);

    this.form.patchValue({
      roleName: role?.name ?? ''
    });
  }

  updateUser(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    var user = this.form.getRawValue();

    this.userService.updateUser(user)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(
        {
          next: (response) => {
            if (response.successful) {
              Swal.fire('Usuario actualizado');
              this.getUserById(user.id);
            }
            else {
              Swal.fire('Usuario no actualizado');
            }
          },
          error: (err) => {
            this.error.set(err.message);
            this.loading.set(false);
          }
        }
      )
  }
}
