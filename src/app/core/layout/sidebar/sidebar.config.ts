import { MenuModule } from './sidebar.models';

export const SIDEBAR_MODULES: MenuModule[] = [
  {
    name: 'Inicio',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'monitoring',
        roles: ['Administrator', 'NormalUser']
      }
    ]
  },
  {
    name: 'Administración',
    items: [
      {
        label: 'Usuarios',
        path: '/dashboard/users',
        icon: 'group',
        roles: ['Administrator']
      },
      {
        label: 'Mi perfil',
        path: '/dashboard/my-profile',
        icon: 'manage_accounts',
        roles: ['Administrator','NormalUser']
      },
      {
        label: 'Roles',
        path: '/dashboard/roles',
        icon: 'admin_panel_settings',
        roles: ['Administrator']
      }
    ]
  },
  {
    name: 'Dispositivos',
    items: [
      {
        label: 'Enlazar ESP',
        path: '/dashboard/provisioning',
        icon: 'cable',
        roles: ['Administrator','NormalUser']
      },
      {
        label: 'Red y servicios',
        path: '/dashboard/connectivity',
        icon: 'network_manage',
        roles: ['Administrator']
      },
      {
        label: 'Mis dispositivos',
        path: '/dashboard/my-devices',
        icon: 'display_settings',
        roles: ['Administrator', 'NormalUser']
      }
    ]
  }
];