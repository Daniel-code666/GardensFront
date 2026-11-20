import { inject, Injectable, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { SessionService } from '../auth/session.service';
import { TelemetryRealtimeDto } from '../models/device-inventory.models';

@Injectable({
  providedIn: 'root'
})
export class TelemetryRealtimeService {
  private readonly sessionService = inject(SessionService);

  private connection: HubConnection | null = null;
  private subscribedMicrocontrollerId: number | null = null;

  private readonly telemetrySubject =
    new Subject<TelemetryRealtimeDto>();

  readonly telemetry$ = this.telemetrySubject.asObservable();

  readonly connected = signal(false);
  readonly reconnecting = signal(false);

  async connect(): Promise<void> {
    if (
      this.connection?.state === HubConnectionState.Connected ||
      this.connection?.state === HubConnectionState.Connecting
    ) {
      return;
    }

    const accessToken = this.sessionService.accessToken();

    if (!accessToken) {
      throw new Error(
        'No existe una sesión válida para iniciar SignalR.'
      );
    }

    if (!this.connection) {
      this.connection = this.createConnection();
      this.registerConnectionEvents();
    }

    await this.connection.start();
    this.connected.set(true);
  }

  async subscribeToMicrocontroller(
    microcontrollerId: number
  ): Promise<void> {
    await this.connect();

    if (!this.connection) {
      return;
    }

    if (
      this.subscribedMicrocontrollerId !== null &&
      this.subscribedMicrocontrollerId !== microcontrollerId
    ) {
      await this.unsubscribeFromCurrentMicrocontroller();
    }

    await this.connection.invoke(
      'SubscribeToMicrocontroller',
      microcontrollerId
    );

    this.subscribedMicrocontrollerId = microcontrollerId;
  }

  async unsubscribeFromCurrentMicrocontroller(): Promise<void> {
    if (
      !this.connection ||
      this.connection.state !== HubConnectionState.Connected ||
      this.subscribedMicrocontrollerId === null
    ) {
      return;
    }

    await this.connection.invoke(
      'UnsubscribeFromMicrocontroller',
      this.subscribedMicrocontrollerId
    );

    this.subscribedMicrocontrollerId = null;
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    await this.connection.stop();

    this.subscribedMicrocontrollerId = null;
    this.connected.set(false);
    this.reconnecting.set(false);
  }

  private createConnection(): HubConnection {
    return new HubConnectionBuilder()
      .withUrl('/hubs/telemetry', {
        accessTokenFactory: () =>
          this.sessionService.accessToken() ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
  }

  private registerConnectionEvents(): void {
    if (!this.connection) {
      return;
    }

    this.connection.on(
      'TelemetryReceived',
      (telemetry: TelemetryRealtimeDto) => {
        this.telemetrySubject.next(telemetry);
      }
    );

    this.connection.onreconnecting(() => {
      this.connected.set(false);
      this.reconnecting.set(true);
    });

    this.connection.onreconnected(async () => {
      this.connected.set(true);
      this.reconnecting.set(false);

      if (this.subscribedMicrocontrollerId !== null) {
        await this.connection?.invoke(
          'SubscribeToMicrocontroller',
          this.subscribedMicrocontrollerId
        );
      }
    });

    this.connection.onclose(() => {
      this.connected.set(false);
      this.reconnecting.set(false);
    });
  }
}