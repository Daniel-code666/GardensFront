import { Component, computed, inject, signal } from '@angular/core';
import { UserApiService } from '../user.api.service';
import { CreateUserRequest, CreateUserResponse } from '../models/register.models';
import { FormBuilder, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CreateRoleResponse } from '../../roles/models/roles.models';
import { finalize, firstValueFrom } from 'rxjs';
import { RolesApiService } from '../../roles/roles.api.service';
import { SelectModule } from 'primeng/select';
import { Button } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { UserDeleteRequest } from '../models/auth.models';
import Swal from 'sweetalert2';
import { AppDialog } from '../../../core/shared/components/app-dialog/app-dialog';

@Component({
  selector: 'app-user-administration',
  imports: [FormsModule, SelectModule, TableModule, Button, InputTextModule, CheckboxModule, AppDialog, ReactiveFormsModule],
  templateUrl: './user-administration.html',
  styleUrl: './user-administration.css',
})
export class UserAdministration {

  private readonly fb = inject(FormBuilder);

  private readonly userService = inject(UserApiService);
  private readonly rolesService = inject(RolesApiService);

  readonly updateDialogVisible = signal(false);
  readonly userToUpdate = signal<CreateUserResponse | null>(null);
  readonly dialogTitle = computed(() =>
    this.userToUpdate() ? 'Actualizar usuario' : 'Crear usuario'
  );

  readonly loading = signal(false);
  readonly error = signal('');

  readonly users = signal<CreateUserResponse[]>([]);
  readonly roles = signal<CreateRoleResponse[]>([]);

  readonly selectedUsers = signal<CreateUserResponse[]>([]);
  readonly selectedGroupState = signal<boolean | null>(null);
  readonly selectedUserIds = computed(
    () => new Set(this.selectedUsers().map(user => user.id))
  );

  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      id: [0, [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(128)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.maxLength(255)]],
      active: [true, [Validators.required]],
      roleId: [0, [Validators.required, Validators.min(1)]],
      roleName: ['', [Validators.required, Validators.maxLength(20)]]
    }
  );

  selectedRole: CreateRoleResponse | null = null;

  ngOnInit(): void {
    this.getAllRoles();
    this.getAllUsers();
  }

  getAllUsers() {
    this.loading.set(true);

    this.userService.getAllUsers(this.selectedRole?.id ?? null, this.selectedRole?.name ?? null)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.users.set(response.result ?? []);
          this.selectedUsers.set([]);
        },
        error: (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      });
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

  async setFormToUpdateUser(user: CreateUserResponse): Promise<void> {
    this.error.set('');
    this.showPassword.set(false);
    this.configurePasswordValidators(false);
    await this.getUserById(user.id);

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
    this.updateDialogVisible.set(true);
  }

  openCreateDialog(): void {
    this.userToUpdate.set(null);
    this.error.set('');
    this.showPassword.set(false);
    this.configurePasswordValidators(true);
    this.form.reset({
      id: 0,
      name: '',
      email: '',
      password: '',
      active: true,
      roleId: 0,
      roleName: ''
    });
    this.updateDialogVisible.set(true);
  }

  saveUser(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.userToUpdate()) {
      this.updateUser();
      return;
    }

    this.createUser();
  }

  createUser(): void {
    const formValue = this.form.getRawValue();
    const request: CreateUserRequest = {
      name: formValue.name,
      email: formValue.email,
      password: formValue.password,
      roleId: formValue.roleId,
      roleName: formValue.roleName
    };

    this.loading.set(true);
    this.error.set('');

    this.userService.createUser(request)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.successful) {
            this.error.set(response.errorMessage ?? 'No fue posible crear el usuario.');
            return;
          }

          this.updateDialogVisible.set(false);
          Swal.fire({
            title: 'Usuario creado',
            text: 'El usuario fue creado correctamente.',
            icon: 'success'
          });
          this.getAllUsers();
        },
        error: (err) => this.error.set(err.message)
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
              this.updateDialogVisible.set(false);
              Swal.fire('Usuario actualizado');
              this.getAllUsers();
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

  async deleteUsers(users: CreateUserResponse[]): Promise<void> {
    const result = await Swal.fire({
      title: '¿Eliminar usuarios seleccionados?',
      text: `Se eliminarán ${users.length} usuario(s). Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b1473e'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.loading.set(true);

    var selectedIds: UserDeleteRequest = {
      selectedIds: users.map(x => x.id)
    }

    this.userService.deleteUsers(selectedIds)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(
        {
          next: (response) => {
            Swal.fire({
              title: 'Usuarios eliminados',
              text: `Se eliminaron ${users.length} usuario(s).`,
              icon: 'success'
            });

            this.selectedUsers.set([]);
            this.getAllUsers();
          },
          error: (err) => {
            this.error.set(err.message);
            this.loading.set(false);
          }
        }
      )
  }

  async reactivateUsers(users: CreateUserResponse[]) {
    const result = await Swal.fire({
      title: '¿Reactivar los usuarios seleccionados?',
      text: `Se reactivarán ${users.length} usuario(s). Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b1af3e'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.loading.set(true);

    var selectedIds: UserDeleteRequest = {
      selectedIds: users.map(x => x.id)
    }

    this.userService.reactivateUsers(selectedIds)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(
        {
          next: () => {
            Swal.fire({
              title: 'Usuarios reactivados',
              text: `Se reactivaron ${users.length} usuario(s).`,
              icon: 'success'
            });

            this.selectedUsers.set([]);
            this.getAllUsers();
          },
          error: (err) => {
            this.error.set(err.message);
            this.loading.set(false);
          }
        }
      )
  }

  isUserSelected(user: CreateUserResponse): boolean {
    return this.selectedUserIds().has(user.id);
  }

  toggleUserSelection(user: CreateUserResponse, checked: boolean): void {
    if (!checked) {
      this.selectedUsers.update(users => users.filter(selected => selected.id !== user.id));
      return;
    }

    const groupChanged = this.selectedGroupState() !== user.active;
    this.selectedGroupState.set(user.active);

    if (groupChanged) {
      this.selectedUsers.set([user]);
      return;
    }

    this.selectedUsers.update(users => {
      const sameGroup = users.filter(selected => selected.active === user.active);

      return sameGroup.some(selected => selected.id === user.id)
        ? sameGroup
        : [...sameGroup, user];
    });
  }

  toggleGroupSelection(visibleUsers: CreateUserResponse[], checked: boolean): void {
    const groupState = this.selectedGroupState();

    if (groupState === null) {
      return;
    }

    const groupUsers = visibleUsers.filter(user => user.active === groupState);
    const groupUserIds = new Set(groupUsers.map(user => user.id));

    if (!checked) {
      this.selectedUsers.update(users => users.filter(user => !groupUserIds.has(user.id)));
      return;
    }

    this.selectedUsers.update(users => {
      const selection = new Map(
        users
          .filter(user => user.active === groupState)
          .map(user => [user.id, user])
      );

      groupUsers.forEach(user => selection.set(user.id, user));

      return [...selection.values()];
    });
  }

  areAllGroupUsersSelected(visibleUsers: CreateUserResponse[]): boolean {
    const groupUsers = this.getVisibleGroupUsers(visibleUsers);

    return groupUsers.length > 0 && groupUsers.every(user => this.isUserSelected(user));
  }

  isGroupSelectionPartial(visibleUsers: CreateUserResponse[]): boolean {
    const groupUsers = this.getVisibleGroupUsers(visibleUsers);
    const selectedCount = groupUsers.filter(user => this.isUserSelected(user)).length;

    return selectedCount > 0 && selectedCount < groupUsers.length;
  }

  canSelectVisibleGroup(visibleUsers: CreateUserResponse[]): boolean {
    return this.getVisibleGroupUsers(visibleUsers).length > 0;
  }

  onUpdateDialogVisibleChange(visible: boolean): void {
    this.updateDialogVisible.set(visible);

    if (!visible) {
      this.userToUpdate.set(null);
      this.showPassword.set(false);
      this.form.reset();
    }
  }

  onRoleChange(roleId: number): void {
    const role = this.roles().find(x => x.id === roleId);

    this.form.patchValue({
      roleName: role?.name ?? ''
    });
  }

  private getVisibleGroupUsers(visibleUsers: CreateUserResponse[]): CreateUserResponse[] {
    const groupState = this.selectedGroupState();

    return groupState === null
      ? []
      : visibleUsers.filter(user => user.active === groupState);
  }

  private configurePasswordValidators(required: boolean): void {
    const validators = required
      ? [Validators.required, Validators.maxLength(255)]
      : [Validators.maxLength(255)];

    this.form.controls.password.setValidators(validators);
    this.form.controls.password.updateValueAndValidity();
  }
}
