import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import Swal from 'sweetalert2';
import { AppDialog } from '../../../core/shared/components/app-dialog/app-dialog';
import { RolesApiService } from '../roles.api.service';
import { CreateRoleRequest, CreateRoleResponse } from '../models/roles.models';

@Component({
  selector: 'app-roles-administration',
  imports: [
    AppDialog,
    Button,
    CheckboxModule,
    FormsModule,
    InputTextModule,
    ReactiveFormsModule,
    SelectModule,
    TableModule,
  ],
  templateUrl: './roles-administration.html',
  styleUrl: './roles-administration.css',
})
export class RolesAdministration {
  private readonly fb = inject(FormBuilder);
  private readonly rolesService = inject(RolesApiService);

  readonly roles = signal<CreateRoleResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly dialogVisible = signal(false);
  readonly roleToUpdate = signal<CreateRoleResponse | null>(null);
  readonly dialogTitle = computed(() =>
    this.roleToUpdate() ? 'Actualizar rol' : 'Crear rol',
  );

  readonly roleTypes = [
    { label: 'Administrativo', value: true },
    { label: 'No administrativo', value: false },
  ];

  selectedRoleType: boolean | null = null;

  readonly form = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(255)]],
    administrativeRole: [false],
  });

  ngOnInit(): void {
    this.getAllRoles();
  }

  getAllRoles(): void {
    this.loading.set(true);
    this.error.set('');

    this.rolesService
      .getAllRoles(null)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.roles.set(response ?? []),
        error: (err) => this.error.set(err.message),
      });
  }

  openCreateDialog(): void {
    this.roleToUpdate.set(null);
    this.error.set('');
    this.form.reset({
      id: 0,
      name: '',
      description: '',
      administrativeRole: false,
    });
    this.dialogVisible.set(true);
  }

  openUpdateDialog(role: CreateRoleResponse): void {
    this.roleToUpdate.set(role);
    this.error.set('');
    this.form.reset(role);
    this.dialogVisible.set(true);
  }

  saveRole(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const roleToUpdate = this.roleToUpdate();

    if (roleToUpdate) {
      this.updateRole({ ...formValue, id: roleToUpdate.id });
      return;
    }

    const request: CreateRoleRequest = {
      name: formValue.name,
      description: formValue.description,
      administrativeRole: formValue.administrativeRole,
    };

    this.createRole(request);
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);

    if (!visible) {
      this.roleToUpdate.set(null);
      this.form.reset();
    }
  }

  private createRole(request: CreateRoleRequest): void {
    this.loading.set(true);
    this.error.set('');

    this.rolesService
      .createRole(request)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.dialogVisible.set(false);
          Swal.fire('Rol creado');
          this.getAllRoles();
        },
        error: (err) => this.error.set(err.message),
      });
  }

  private updateRole(request: CreateRoleResponse): void {
    this.loading.set(true);
    this.error.set('');

    this.rolesService
      .updateRole(request)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (updated) => {
          if (!updated) {
            this.error.set('No fue posible actualizar el rol.');
            return;
          }

          this.dialogVisible.set(false);
          Swal.fire('Rol actualizado');
          this.getAllRoles();
        },
        error: (err) => this.error.set(err.message),
      });
  }

}
