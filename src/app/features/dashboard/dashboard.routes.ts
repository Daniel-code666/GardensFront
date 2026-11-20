import { Routes } from "@angular/router";
import { adminGuard, authGuard } from "../../core/auth/auth.guard";

export const DASHBOARD_ROUTES: Routes = [
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('../../core/layout/app-shell/app-shell').then(m => m.AppShell),
        children: [
            // registrar las rutas hijas ej: dashboard/profile junto con el guard adecuado
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'dashboard'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard-page/dashboard-page').then(m => m.DashboardPage)
            },
            {
                path: 'roles',
                loadComponent: () => import('../roles/roles-administration/roles-administration').then(m => m.RolesAdministration),
                canActivate: [adminGuard]
            },
            {
                path: 'users',
                loadComponent: () => import('../auth/user-administration/user-administration').then(m => m.UserAdministration),
                canActivate: [adminGuard]
            },
            {
                path: 'my-profile',
                loadComponent: () => import('../auth/my-profile/my-profile').then(m => m.MyProfile),
            },
            {
                path: 'connectivity',
                loadComponent: () => import('../connectivity/connectivity').then(m => m.Connectivity),
                canActivate: [adminGuard]
            },
            {
                path: 'provisioning',
                loadComponent: () => import('../provisioning/provisioning').then(m => m.Provisioning),
            },
            {
                path: 'my-devices',
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        loadComponent: () =>
                            import('../my-devices/my-devices').then(m => m.MyDevices)
                    },
                    {
                        path: 'devices/:microcontrollerId',
                        loadComponent: () =>
                            import('../sensors-actuators/sensors-actuators').then(m => m.SensorsActuators)
                    },
                    {
                        path: 'devices/:microcontrollerId/telemetry/:deviceId',
                        loadComponent: () =>
                            import('../device-telemetry-demand/device-telemetry-demand').then(m => m.DeviceTelemetryDemand)
                    }
                ]
            }
        ]
    },
];
