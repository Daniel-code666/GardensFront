import { Injectable, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import {
  DeviceFactoryResetMessage,
  DeviceFactoryResetResult,
  SerialDeviceEvent,
  SerialLogEntry,
} from '../models/provisioning.models';

interface HuertaSerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number; bufferSize?: number }): Promise<void>;
  close(): Promise<void>;
}

interface HuertaSerial {
  requestPort(): Promise<HuertaSerialPort>;
}

type NavigatorWithSerial = Navigator & { serial?: HuertaSerial };

@Injectable({ providedIn: 'root' })
export class WebSerialService {
  private port: HuertaSerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readTask: Promise<void> | null = null;
  private reading = false;
  private readonly eventSubject = new Subject<SerialDeviceEvent>();
  private readonly connectedState = signal(false);
  private readonly logState = signal<SerialLogEntry[]>([]);

  readonly events = this.eventSubject.asObservable();
  readonly connected = this.connectedState.asReadonly();
  readonly log = this.logState.asReadonly();

  get supported(): boolean {
    return 'serial' in navigator;
  }

  async connect(): Promise<void> {
    const serial = (navigator as NavigatorWithSerial).serial;
    if (!serial) {
      throw new Error('Web Serial no está disponible. Use Chrome o Edge desde localhost.');
    }

    await this.disconnect();
    this.port = await serial.requestPort();
    await this.port.open({ baudRate: 115200, bufferSize: 8192 });

    if (!this.port.writable) {
      await this.port.close();
      this.port = null;
      throw new Error('El puerto no permite escritura.');
    }

    this.writer = this.port.writable.getWriter();
    this.reading = true;
    this.connectedState.set(true);
    this.appendLog('info', 'Puerto serial conectado a 115200 baudios.');
    this.readTask = this.readLoop();
  }

  async disconnect(): Promise<void> {
    this.reading = false;

    try {
      await this.reader?.cancel();
    } catch {
      // El puerto puede haber sido retirado físicamente.
    }

    try {
      await this.readTask;
    } catch {
      // El error ya se registra dentro del ciclo de lectura.
    }

    try {
      this.writer?.releaseLock();
    } catch {
      // El stream puede estar cerrado.
    }

    try {
      await this.port?.close();
    } catch {
      // El puerto puede haberse cerrado desde el navegador.
    }

    this.reader = null;
    this.writer = null;
    this.readTask = null;
    this.port = null;
    this.connectedState.set(false);
  }

  async identify(): Promise<void> {
    await this.send({
      type: 'device_identify',
      contractVersion: 1,
      requestId: this.createRequestId(),
    });
    this.appendLog('info', 'Solicitud de identificación enviada.');
  }

  async factoryReset(
    deviceId: string,
    contractVersion: number,
  ): Promise<DeviceFactoryResetResult> {
    const requestId = this.createRequestId();
    const message: DeviceFactoryResetMessage = {
      type: 'device_factory_reset',
      contractVersion,
      requestId,
      deviceId,
    };

    const pending: { subscription?: Subscription; timeoutId?: number } = {};

    const resultPromise = new Promise<DeviceFactoryResetResult>((resolve, reject) => {
      pending.subscription = this.events.subscribe((event) => {
        if (event.type !== 'device_factory_reset_result' || event['requestId'] !== requestId) {
          return;
        }

        if (pending.timeoutId !== undefined) {
          window.clearTimeout(pending.timeoutId);
        }
        pending.subscription?.unsubscribe();
        resolve(event as DeviceFactoryResetResult);
      });

      pending.timeoutId = window.setTimeout(() => {
        pending.subscription?.unsubscribe();
        reject(new Error('El ESP no confirmó el borrado de la memoria NVS.'));
      }, 10_000);
    });

    try {
      await this.send(message);
      this.appendInfo('Solicitud de borrado de NVS enviada al ESP.');
      return await resultPromise;
    } catch (error) {
      if (pending.timeoutId !== undefined) {
        window.clearTimeout(pending.timeoutId);
      }
      pending.subscription?.unsubscribe();
      throw error;
    }
  }

  async send(message: unknown): Promise<void> {
    if (!this.writer || !this.connectedState()) {
      throw new Error('Conecte el ESP antes de enviar información.');
    }

    const payload = new TextEncoder().encode(`${JSON.stringify(message)}\n`);
    await this.writer.write(payload);
  }

  clearLog(): void {
    this.logState.set([]);
  }

  appendInfo(message: string): void {
    this.appendLog('info', message);
  }

  private async readLoop(): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (this.reading && this.port?.readable) {
        this.reader = this.port.readable.getReader();
        try {
          while (this.reading) {
            const { value, done } = await this.reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              this.processLine(line);
            }
          }
        } finally {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido de lectura serial.';
      this.appendLog('error', `Lectura serial finalizada: ${message}`);
    } finally {
      this.connectedState.set(false);
    }
  }

  private processLine(line: string): void {
    const value = line.trim();
    if (!value.startsWith('{')) {
      const diagnostic = this.describeDiagnostic(value);
      if (diagnostic) {
        this.appendLog('info', diagnostic);
      }
      return;
    }

    try {
      const event = JSON.parse(value) as SerialDeviceEvent;
      this.appendLog('event', this.describeEvent(event), event);
      this.eventSubject.next(event);
    } catch {
      this.appendLog('error', 'El ESP envió una línea JSON que no pudo interpretarse.');
    }
  }

  private describeDiagnostic(value: string): string | null {
    const safePrefixes = [
      'Desconexion WiFi |',
      'Conectado |',
      'Credenciales Wi-Fi verificadas',
      'No fue posible configurar el dominio Wi-Fi',
      'Prueba Wi-Fi ',
      'Reintentando asociacion Wi-Fi',
      'Wi-Fi recuperado',
    ];

    return safePrefixes.some((prefix) => value.startsWith(prefix)) ? value : null;
  }

  private describeEvent(event: SerialDeviceEvent): string {
    if (event.type === 'device_identify_result') {
      return `Dispositivo identificado: ${String(event['deviceId'])}`;
    }

    if (event.type === 'device_configuration_status') {
      const errorCode = event['errorCode'] ? ` · ${String(event['errorCode'])}` : '';
      return `${String(event['stage'])}: ${String(event['status'])}${errorCode}`;
    }

    if (event.type === 'device_configuration_result') {
      return event['success'] ? 'Configuración completada.' : 'La configuración finalizó con error.';
    }

    if (event.type === 'device_factory_reset_result') {
      return event['success']
        ? 'La memoria NVS fue borrada correctamente.'
        : `No fue posible borrar la memoria NVS · ${String(event['errorCode'] ?? 'unknown')}`;
    }

    return `Evento recibido: ${event.type}`;
  }

  private appendLog(
    kind: SerialLogEntry['kind'],
    message: string,
    payload?: SerialDeviceEvent,
  ): void {
    this.logState.update((entries) => [
      ...entries,
      {
        timestamp: new Date().toISOString(),
        kind,
        message,
        ...(payload ? { payload } : {}),
      },
    ]);
  }

  private createRequestId(): string {
    return crypto.randomUUID().replaceAll('-', '').slice(0, 32);
  }
}
