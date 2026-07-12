export interface RealtimeTransport {
  emit(event: string, payload: unknown): void;
}

class NoopTransport implements RealtimeTransport {
  emit(): void {
    // No realtime transport configured. This keeps the notification engine
    // fully decoupled from Socket.IO / SSE / Push implementations. A transport
    // can be registered at bootstrap via `setRealtimeTransport`.
  }
}

let transport: RealtimeTransport = new NoopTransport();

export const setRealtimeTransport = (instance: RealtimeTransport): void => {
  transport = instance;
};

export const emitRealtime = (event: string, payload: unknown): void => {
  try {
    transport.emit(event, payload);
  } catch (err) {
    // Realtime delivery must never break the core business flow.
    // eslint-disable-next-line no-console
    console.error('Realtime emit failed', err);
  }
};
