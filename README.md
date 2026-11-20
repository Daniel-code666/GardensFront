# Gardens Front

Aplicación web de la plataforma Huerta. Permite administrar usuarios y roles, aprovisionar microcontroladores ESP32-C3, consultar inventario, visualizar telemetría histórica y en tiempo real, y ejecutar comandos sobre sensores y actuadores.

## Tecnologías

- Angular 21 con componentes standalone y signals.
- TypeScript 5.9.
- PrimeNG 21 y PrimeUIX Themes.
- Chart.js para visualización de telemetría.
- SignalR para actualizaciones en tiempo real.
- SweetAlert2 para confirmaciones y mensajes.
- Web Serial para configurar el ESP32-C3 desde el navegador.
- Nginx y Docker para publicación.

## Funcionalidades

- Inicio de sesión y gestión local de la sesión JWT.
- Guards de autenticación y autorización administrativa.
- Administración de usuarios y roles.
- Perfil del usuario autenticado.
- Configuración de conectividad de API y broker MQTT.
- Aprovisionamiento y restablecimiento de dispositivos mediante Web Serial.
- Listado de microcontroladores, sensores y actuadores.
- Consulta histórica de telemetría con filtros.
- Gráficas, indicadores y resumen operativo.
- Telemetría en tiempo real mediante SignalR.
- Consulta de lecturas y ejecución de comandos sobre dispositivos.

## Arquitectura

El proyecto está organizado por funcionalidades. Los elementos transversales permanecen en `core`:

```text
src/app/
├── core/
│   ├── auth/          Sesión, guards e interceptor JWT
│   ├── http/          Manejo de errores y parámetros HTTP
│   ├── layout/        App shell, header y barra lateral
│   ├── models/        Contratos compartidos
│   ├── services/      API, SignalR, provisioning y Web Serial
│   ├── shared/        Componentes reutilizables
│   └── theme/         Tema de PrimeNG
└── features/
    ├── auth/          Login, registro, perfil y usuarios
    ├── connectivity/  Configuración de conectividad
    ├── dashboard/     Resumen y telemetría en tiempo real
    ├── my-devices/    Microcontroladores asociados
    ├── provisioning/  Alta y factory reset del ESP
    ├── roles/         Administración de roles
    ├── sensors-actuators/
    └── device-telemetry-demand/
```

Las rutas de funcionalidades se cargan de manera diferida desde `app.routes.ts` y `dashboard.routes.ts`.

## Requisitos

- Node.js 24.
- npm 12.
- GardensBack disponible en `http://127.0.0.1:8080` para desarrollo local.
- Chrome o Edge para las operaciones que utilizan Web Serial.

## Instalación

```powershell
npm ci
```

## Desarrollo local

```powershell
npm start
```

La aplicación estará disponible en:

```text
http://localhost:4200
```

El servidor de Angular utiliza `proxy.conf.json`:

- `/api` se redirige al backend en `http://127.0.0.1:8080`.
- `/hubs` se redirige al mismo backend con soporte WebSocket.

El front utiliza rutas relativas, por lo que no es necesario incluir una dirección absoluta del backend en el build:

```ts
export const environment = {
  apiBaseUrl: '/api'
};
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de producción |
| `npm run watch` | Compila en modo development observando cambios |
| `npm test` | Ejecuta las pruebas con Vitest |

## Build de producción

```powershell
npm run build -- --configuration production
```

Los archivos se generan en:

```text
dist/GardensFront/browser
```

## Docker

La imagen utiliza una compilación multietapa con Node y Nginx:

```powershell
docker build -f dockerfile -t gardens-front:latest .
docker run --rm -p 4200:80 gardens-front:latest
```

En el entorno completo se recomienda usar el `compose.yaml` ubicado en la infraestructura general del proyecto. El servicio `gardens-front` se comunica con `gardens-back:8080` mediante la red interna de Docker.

Nginx cumple dos funciones:

- Publicar los archivos estáticos de Angular.
- Reenviar `/api` y `/hubs` hacia el backend.

También contiene el fallback a `index.html` requerido para abrir directamente rutas internas de Angular.

## Web Serial

Web Serial requiere un contexto seguro:

- `http://localhost` funciona durante el desarrollo.
- En un dominio o equipo remoto se debe utilizar HTTPS.
- La característica debe abrirse en Chrome o Edge.
- El navegador solicita al usuario seleccionar físicamente el puerto serial.

## Autenticación y seguridad

- El interceptor agrega el JWT a las solicitudes autenticadas.
- Los guards controlan acceso general y módulos administrativos.
- Las credenciales MQTT y claves del dispositivo no se almacenan en Angular.
- El token de usuario no se entrega al ESP32-C3.
- No se deben guardar secretos dentro de `environment.ts`.

## Integración con el backend

La aplicación consume principalmente:

- `/api/Auth` para autenticación.
- `/api/User` y `/api/Roles` para administración.
- `/api/DeviceConnectivityConfiguration` para conectividad.
- `/api/DeviceProvisioning` para alta y restablecimiento.
- `/api/DeviceInventory` para dispositivos, telemetría y comandos.
- `/hubs/telemetry` para telemetría en tiempo real.

El contrato detallado se puede consultar en Swagger cuando GardensBack está en ejecución.

## Pruebas

```powershell
npm test -- --watch=false
```

Antes de integrar cambios relevantes se recomienda ejecutar tanto las pruebas como el build de producción:

```powershell
npm test -- --watch=false
npm run build -- --configuration production
```

## Estilo de código

- Mantener las funcionalidades dentro de `features`.
- Ubicar servicios, guards, interceptores y layouts transversales en `core`.
- Preferir signals para estado de interfaz y RxJS para operaciones asíncronas.
- Mantener los DTO sincronizados con los contratos del backend.
- Reutilizar las variables visuales definidas en `huerta-styles.css`.
