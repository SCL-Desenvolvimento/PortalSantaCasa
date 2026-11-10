import * as signalR from '@microsoft/signalr';
import { vi } from 'vitest';

/** Replaces only the network transport; services still register and handle real events. */
export class RealtimeHubStub {
  state = signalR.HubConnectionState.Disconnected;
  readonly handlers = new Map<string, (...args: any[]) => void>();
  readonly start = vi.fn(async () => { this.state = signalR.HubConnectionState.Connected; });
  readonly invoke = vi.fn(async (_method: string, ..._args: any[]) => undefined);
  closed: () => void = () => undefined;
  reconnecting: () => void = () => undefined;
  reconnected: () => void = () => undefined;

  on(event: string, callback: (...args: any[]) => void): void { this.handlers.set(event, callback); }
  onclose(callback: () => void): void { this.closed = callback; }
  onreconnecting(callback: () => void): void { this.reconnecting = callback; }
  onreconnected(callback: () => void): void { this.reconnected = callback; }
  emit(event: string, ...args: any[]): void {
    const handler = this.handlers.get(event);
    if (!handler) throw new Error(`No listener for ${event}`);
    handler(...args);
  }
}

export function installRealtimeHubStub(): RealtimeHubStub {
  const hub = new RealtimeHubStub();
  vi.spyOn(signalR.HubConnectionBuilder.prototype, 'build')
    .mockReturnValue(hub as unknown as signalR.HubConnection);
  return hub;
}
